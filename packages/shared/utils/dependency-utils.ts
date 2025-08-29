/**
 * Dependency management utilities
 */

import { type FeatureConfig } from '../types/feature-types';
import { type FeatureDependencyGraph } from './feature-utils';

export interface DependencyResolution {
  resolved: string[];
  unresolved: string[];
  conflicts: Array<{
    feature: string;
    conflicts: string[];
  }>;
}

export interface DependencyTree {
  feature: FeatureConfig;
  dependencies: DependencyTree[];
  depth: number;
  circular?: boolean;
}

export interface DependencyAnalysis {
  tree: DependencyTree;
  graph: FeatureDependencyGraph;
  resolution: DependencyResolution;
  loadOrder: string[];
  circular: string[][];
}

export function resolveDependencies(
  features: FeatureConfig[],
  targetFeature: string
): DependencyResolution {
  const resolved = new Set<string>();
  const unresolved = new Set<string>();
  const conflicts: Array<{ feature: string; conflicts: string[] }> = [];
  const visited = new Set<string>();

  function resolve(featureName: string, path: string[] = []): void {
    if (visited.has(featureName)) {
      if (path.includes(featureName)) {
        // Circular dependency
        const cycle = path.slice(path.indexOf(featureName));
        conflicts.push({
          feature: featureName,
          conflicts: cycle
        });
      }
      return;
    }

    visited.add(featureName);
    const currentPath = [...path, featureName];

    const feature = features.find(f => f.name === featureName);
    if (!feature) {
      unresolved.add(featureName);
      return;
    }

    // Resolve dependencies first
    feature.dependencies.forEach(dep => {
      resolve(dep, currentPath);
    });

    resolved.add(featureName);
  }

  resolve(targetFeature);

  return {
    resolved: Array.from(resolved),
    unresolved: Array.from(unresolved),
    conflicts
  };
}

export function buildDependencyTree(
  features: FeatureConfig[],
  rootFeature: string,
  maxDepth: number = 10
): DependencyTree | null {
  const featureMap = new Map(features.map(f => [f.name, f]));
  const visited = new Set<string>();

  function buildTree(
    featureName: string,
    depth: number = 0,
    path: string[] = []
  ): DependencyTree | null {
    if (depth > maxDepth || visited.has(featureName)) {
      return null;
    }

    const feature = featureMap.get(featureName);
    if (!feature) {
      return null;
    }

    visited.add(featureName);
    const currentPath = [...path, featureName];

    const dependencies: DependencyTree[] = [];
    let hasCircular = false;

    feature.dependencies.forEach(dep => {
      const depTree = buildTree(dep, depth + 1, currentPath);
      if (depTree) {
        dependencies.push(depTree);
        if (currentPath.includes(dep)) {
          hasCircular = true;
          depTree.circular = true;
        }
      }
    });

    return {
      feature,
      dependencies,
      depth,
      circular: hasCircular
    };
  }

  return buildTree(rootFeature);
}

export function analyzeDependencies(
  features: FeatureConfig[],
  targetFeature: string
): DependencyAnalysis {
  const tree = buildDependencyTree(features, targetFeature);
  const graph = buildDependencyGraph(features);
  const resolution = resolveDependencies(features, targetFeature);
  const loadOrder = getFeatureLoadOrder(features);
  const circular = detectAllCircularDependencies(features);

  return {
    tree: tree!,
    graph,
    resolution,
    loadOrder: loadOrder.map(f => f.name),
    circular
  };
}

export function detectAllCircularDependencies(
  features: FeatureConfig[]
): string[][] {
  const circular: string[][] = [];
  const visited = new Set<string>();

  features.forEach(feature => {
    if (!visited.has(feature.name)) {
      const cycle = detectCircularDependencies(feature, features);
      if (cycle.length > 0 && !circular.some(c => arraysEqual(c, cycle))) {
        circular.push(cycle);
      }
      visited.add(feature.name);
    }
  });

  return circular;
}

export function validateDependencyVersions(
  features: FeatureConfig[]
): Array<{
  feature: string;
  dependency: string;
  requiredVersion: string;
  actualVersion: string;
  compatible: boolean;
}> {
  const results: Array<{
    feature: string;
    dependency: string;
    requiredVersion: string;
    actualVersion: string;
    compatible: boolean;
  }> = [];

  features.forEach(feature => {
    feature.dependencies.forEach(depName => {
      const depFeature = features.find(f => f.name === depName);
      if (depFeature) {
        // For now, assume compatibility if both have versions
        // In a real implementation, you'd check actual version requirements
        const compatible = Boolean(feature.version && depFeature.version);
        
        results.push({
          feature: feature.name,
          dependency: depName,
          requiredVersion: feature.version,
          actualVersion: depFeature.version,
          compatible
        });
      }
    });
  });

  return results;
}

export function getTransitiveDependencies(
  featureName: string,
  features: FeatureConfig[]
): string[] {
  const visited = new Set<string>();
  const transitive = new Set<string>();

  function collect(featureName: string): void {
    if (visited.has(featureName)) return;
    
    visited.add(featureName);
    const feature = features.find(f => f.name === featureName);
    
    if (feature) {
      feature.dependencies.forEach(dep => {
        transitive.add(dep);
        collect(dep);
      });
    }
  }

  collect(featureName);
  return Array.from(transitive);
}

export function getAffectedFeatures(
  changedFeature: string,
  features: FeatureConfig[]
): string[] {
  const graph = buildDependencyGraph(features);
  const affected = new Set<string>();

  function markAffected(featureName: string): void {
    if (affected.has(featureName)) return;
    
    affected.add(featureName);
    graph[featureName]?.dependents.forEach(dep => {
      markAffected(dep);
    });
  }

  markAffected(changedFeature);
  return Array.from(affected);
}

export function optimizeDependencyOrder(
  features: FeatureConfig[]
): FeatureConfig[] {
  const graph = buildDependencyGraph(features);
  
  // Topological sort
  const result: FeatureConfig[] = [];
  const visited = new Set<string>();
  const tempVisited = new Set<string>();

  function visit(featureName: string): void {
    if (tempVisited.has(featureName)) {
      throw new Error(`Circular dependency detected: ${featureName}`);
    }
    
    if (visited.has(featureName)) return;
    
    tempVisited.add(featureName);
    
    graph[featureName]?.dependencies.forEach(dep => {
      visit(dep);
    });
    
    tempVisited.delete(featureName);
    visited.add(featureName);
    
    const feature = features.find(f => f.name === featureName);
    if (feature) {
      result.unshift(feature);
    }
  }

  features.forEach(feature => {
    if (!visited.has(feature.name)) {
      visit(feature.name);
    }
  });

  return result;
}

export function calculateDependencyComplexity(
  graph: FeatureDependencyGraph
): Record<string, number> {
  const complexity: Record<string, number> = {};

  Object.keys(graph).forEach(featureName => {
    complexity[featureName] = calculateFeatureComplexity(featureName, graph);
  });

  return complexity;
}

function calculateFeatureComplexity(
  featureName: string,
  graph: FeatureDependencyGraph,
  visited: Set<string> = new Set()
): number {
  if (visited.has(featureName)) return 0;
  
  visited.add(featureName);
  let complexity = 1; // Base complexity

  graph[featureName]?.dependencies.forEach(dep => {
    complexity += calculateFeatureComplexity(dep, graph, visited);
  });

  return complexity;
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

function buildDependencyGraph(features: FeatureConfig[]): FeatureDependencyGraph {
  const graph: FeatureDependencyGraph = {};

  // Initialize graph
  features.forEach(feature => {
    graph[feature.name] = {
      dependencies: [...feature.dependencies],
      dependents: [],
      depth: 0
    };
  });

  // Build dependents
  features.forEach(feature => {
    feature.dependencies.forEach(dep => {
      const depNode = graph[dep];
      if (depNode) {
        depNode.dependents.push(feature.name);
      }
    });
  });

  // Calculate depths
  Object.keys(graph).forEach(featureName => {
    const node = graph[featureName];
    if (node) {
      node.depth = calculateDepth(featureName, graph);
    }
  });

  return graph;
}

function calculateDepth(featureName: string, graph: FeatureDependencyGraph): number {
  const visited = new Set<string>();

  function dfs(name: string): number {
    if (visited.has(name)) {
      return graph[name]?.depth || 0;
    }

    visited.add(name);
    let maxDepth = 0;

    const node = graph[name];
    if (!node) {
      return 0;
    }

    for (const dep of node.dependencies) {
      const depDepth = dfs(dep);
      maxDepth = Math.max(maxDepth, depDepth);
    }

    node.depth = maxDepth + 1;
    return node.depth;
  }

  return dfs(featureName);
}

function detectCircularDependencies(
  feature: FeatureConfig,
  allFeatures: FeatureConfig[]
): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCircularDependency(featureName: string, path: string[] = []): string[] {
    if (recursionStack.has(featureName)) {
      const cycleStart = path.indexOf(featureName);
      return path.slice(cycleStart);
    }

    if (visited.has(featureName)) {
      return [];
    }

    visited.add(featureName);
    recursionStack.add(featureName);

    const currentFeature = allFeatures.find(f => f.name === featureName);
    if (!currentFeature) {
      recursionStack.delete(featureName);
      return [];
    }

    const newPath = [...path, featureName];

    for (const dep of currentFeature.dependencies) {
      const cycle = hasCircularDependency(dep, newPath);
      if (cycle.length > 0) {
        recursionStack.delete(featureName);
        return cycle;
      }
    }

    recursionStack.delete(featureName);
    return [];
  }

  return hasCircularDependency(feature.name);
}

function getFeatureLoadOrder(features: FeatureConfig[]): FeatureConfig[] {
  const graph = buildDependencyGraph(features);
  
  return features
    .sort((a, b) => {
      const depthA = graph[a.name]?.depth || 0;
      const depthB = graph[b.name]?.depth || 0;
      return depthA - depthB;
    });
}

export const dependencyUtils = {
  resolveDependencies,
  buildDependencyTree,
  analyzeDependencies,
  detectAllCircularDependencies,
  validateDependencyVersions,
  getTransitiveDependencies,
  getAffectedFeatures,
  optimizeDependencyOrder,
  calculateDependencyComplexity
};
