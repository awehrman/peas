/**
 * Feature utility functions
 */
import {
  type FeatureConfig,
} from "../types/feature-types";

export interface FeatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FeatureDependencyGraph {
  [featureName: string]: {
    dependencies: string[];
    dependents: string[];
    depth: number;
  };
}

export function validateFeatureConfig(
  config: FeatureConfig
): FeatureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.name) {
    errors.push("Feature name is required");
  }

  if (!config.version) {
    errors.push("Feature version is required");
  }

  if (!config.dependencies) {
    warnings.push("Feature has no dependencies defined");
  }

  // Version format validation
  if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
    warnings.push("Feature version should follow semver format (x.y.z)");
  }

  // Name format validation
  if (config.name && !/^[a-z0-9-]+$/.test(config.name)) {
    warnings.push(
      "Feature name should contain only lowercase letters, numbers, and hyphens"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateFeatureDependencies(
  feature: FeatureConfig,
  availableFeatures: FeatureConfig[]
): FeatureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const availableFeatureNames = availableFeatures.map((f) => f.name);
  const missingDependencies = feature.dependencies.filter(
    (dep) => !availableFeatureNames.includes(dep)
  );

  if (missingDependencies.length > 0) {
    errors.push(`Missing dependencies: ${missingDependencies.join(", ")}`);
  }

  // Check for circular dependencies
  const circularDeps = detectCircularDependencies(feature, availableFeatures);
  if (circularDeps.length > 0) {
    errors.push(`Circular dependencies detected: ${circularDeps.join(" -> ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function detectCircularDependencies(
  feature: FeatureConfig,
  allFeatures: FeatureConfig[]
): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCircularDependency(
    featureName: string,
    path: string[] = []
  ): string[] {
    if (recursionStack.has(featureName)) {
      const cycleStart = path.indexOf(featureName);
      return path.slice(cycleStart);
    }

    if (visited.has(featureName)) {
      return [];
    }

    visited.add(featureName);
    recursionStack.add(featureName);

    const currentFeature = allFeatures.find((f) => f.name === featureName);
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

export function buildDependencyGraph(
  features: FeatureConfig[]
): FeatureDependencyGraph {
  const graph: FeatureDependencyGraph = {};

  // Initialize graph
  features.forEach((feature) => {
    graph[feature.name] = {
      dependencies: [...feature.dependencies],
      dependents: [],
      depth: 0,
    };
  });

  // Build dependents
  features.forEach((feature) => {
    feature.dependencies.forEach((dep) => {
      if (graph[dep]) {
        graph[dep].dependents.push(feature.name);
      }
    });
  });

  // Calculate depths
  Object.keys(graph).forEach((featureName) => {
    const node = graph[featureName];
    if (node) {
      node.depth = calculateDepth(featureName, graph);
    }
  });

  return graph;
}

function calculateDepth(
  featureName: string,
  graph: FeatureDependencyGraph
): number {
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

export function getFeatureLoadOrder(
  features: FeatureConfig[]
): FeatureConfig[] {
  const graph = buildDependencyGraph(features);

  return features.sort((a, b) => {
    const depthA = graph[a.name]?.depth || 0;
    const depthB = graph[b.name]?.depth || 0;
    return depthA - depthB;
  });
}

export function getFeatureDependents(
  featureName: string,
  graph: FeatureDependencyGraph
): string[] {
  return graph[featureName]?.dependents || [];
}

export function getFeatureDependencies(
  featureName: string,
  graph: FeatureDependencyGraph
): string[] {
  return graph[featureName]?.dependencies || [];
}

export function canFeatureBeDisabled(
  featureName: string,
  graph: FeatureDependencyGraph
): boolean {
  const dependents = getFeatureDependents(featureName, graph);
  return dependents.length === 0;
}

export function getFeaturesToDisable(
  featureName: string,
  graph: FeatureDependencyGraph
): string[] {
  const dependents = getFeatureDependents(featureName, graph);
  const featuresToDisable: string[] = [featureName];

  dependents.forEach((dependent) => {
    featuresToDisable.push(...getFeaturesToDisable(dependent, graph));
  });

  return [...new Set(featuresToDisable)];
}

export function mergeFeatureConfigs(
  base: FeatureConfig,
  overrides: Partial<FeatureConfig>
): FeatureConfig {
  return {
    ...base,
    ...overrides,
    dependencies: [...base.dependencies, ...(overrides.dependencies || [])],
    config: {
      ...base.config,
      ...overrides.config,
    },
  };
}

export function compareFeatureVersions(
  version1: string,
  version2: string
): number {
  const parseVersion = (version: string): number[] => {
    return version.split(".").map(Number);
  };

  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

export function isFeatureCompatible(
  feature: FeatureConfig,
  requiredVersion: string
): boolean {
  return compareFeatureVersions(feature.version, requiredVersion) >= 0;
}

export function getFeatureCompatibilityMatrix(
  features: FeatureConfig[]
): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {};

  features.forEach((feature1) => {
    matrix[feature1.name] = {};

    features.forEach((feature2) => {
      const feature1Matrix = matrix[feature1.name];
      if (feature1Matrix) {
        feature1Matrix[feature2.name] = isFeatureCompatible(
          feature2,
          feature1.version
        );
      }
    });
  });

  return matrix;
}

export const featureUtils = {
  validateFeatureConfig,
  validateFeatureDependencies,
  detectCircularDependencies,
  buildDependencyGraph,
  getFeatureLoadOrder,
  getFeatureDependents,
  getFeatureDependencies,
  canFeatureBeDisabled,
  getFeaturesToDisable,
  mergeFeatureConfigs,
  compareFeatureVersions,
  isFeatureCompatible,
  getFeatureCompatibilityMatrix,
};
