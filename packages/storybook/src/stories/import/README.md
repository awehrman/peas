# Import Stories

This directory contains comprehensive Storybook stories for the import functionality, showcasing components with full context provider integration.

## Story Structure

### Components

- **`components/import-file-upload.stories.tsx`** - Stories for the ImportFileUpload component with full context provider

### Page

- **`page/import-page.stories.tsx`** - Stories for the complete ImportPage component
- **`page/import-page-route.stories.tsx`** - Stories for the page route with server data integration

## Context Provider Integration

All stories now utilize the **full `ImportProvider`** context instead of individual providers, providing:

### ✅ Complete Context Stack

- **ImportProvider** - Main provider wrapper
- **StatsProvider** - Manages import statistics
- **UploadProvider** - Handles file upload state
- **WebSocketProvider** - Real-time updates
- **ActivityProvider** - User activity tracking

### ✅ Server Integration

- Mock server actions (`getImportStats`, `refetchImportStats`)
- Realistic data scenarios (empty, with data, large datasets, errors)
- Loading states and error handling

### ✅ Interactive Controls

- Initial stats configuration (notes, ingredients, errors)
- Upload state simulation (default, uploading, success, error)
- Component state controls (disabled, custom styling)

## Story Categories

### ImportFileUpload Component Stories

- **Default** - Basic file upload with full context
- **Success** - Successful upload state with context
- **Error** - Error state with context
- **Disabled** - Disabled state with context
- **WithCustomClass** - Custom styling with context
- **WithLargeDataset** - Large dataset handling
- **WithNoErrors** - Clean success state

### ImportPage Stories

- **Default** - Empty page with no initial data
- **WithInitialData** - Page with server data loaded
- **Uploading** - Active upload in progress
- **UploadSuccess** - Successful upload completion
- **UploadError** - Upload error state
- **Disabled** - Upload functionality disabled
- **LargeDataset** - High-volume data handling
- **NoErrors** - Clean state with no parsing errors

### ImportPageRoute Stories

- **Default** - Route with no server data
- **WithServerData** - Route with fetched server data
- **LargeDataset** - Route with large dataset
- **NoErrors** - Route with no parsing errors
- **Loading** - Loading state while fetching data
- **ServerError** - Error handling with fallback

## Key Features

### 🎯 Full Context Integration

All stories demonstrate the complete context provider stack, showing how components work together in the real application.

### 📊 Realistic Data Scenarios

Stories include various data scenarios:

- Empty states (no data)
- Typical usage (moderate data)
- Large datasets (high-volume scenarios)
- Error states (parsing errors, server errors)

### 🔄 Interactive Controls

Storybook controls allow you to:

- Adjust initial stats (notes, ingredients, errors)
- Simulate different upload states
- Toggle component states (disabled, custom styling)
- Test different server data scenarios

### 🎨 Visual Feedback

Stories include:

- Context provider status indicators
- Stats display with color-coded metrics
- Upload state visualizations
- Error and success state representations

## Usage

### Running Storybook

```bash
# Start Storybook
yarn storybook

# Build Storybook
yarn build-storybook
```

### Navigating Stories

1. **Import/Components/ImportFileUpload** - Component-level stories
2. **Import/Page/ImportPage** - Complete page stories
3. **Import/Page/ImportPageRoute** - Route-level stories

### Using Controls

- Use the **Controls** panel to adjust story parameters
- Test different data scenarios and component states
- Verify context provider integration and behavior

## Development

### Adding New Stories

1. Create story files in appropriate directories
2. Use the full `ImportProvider` context wrapper
3. Include realistic mock data and scenarios
4. Add interactive controls for testing
5. Document story purposes and use cases

### Mock Data

- Use the provided mock data factories
- Create realistic scenarios for different use cases
- Include edge cases and error states
- Ensure data reflects real-world usage patterns

### Context Provider Testing

- Verify all context providers are active
- Test context state management
- Ensure proper error handling
- Validate real-time update simulation

## Best Practices

1. **Always use full context** - Don't use individual providers in isolation
2. **Include realistic data** - Use data that reflects real usage
3. **Test edge cases** - Include error states and boundary conditions
4. **Provide controls** - Make stories interactive and testable
5. **Document behavior** - Explain what each story demonstrates
6. **Visual feedback** - Show context provider status and state changes
