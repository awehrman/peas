# Status Actions Utilities

This folder contains utilities for injecting and managing status-related actions in worker pipelines.

- `injectStandardStatusActions`: Adds generic processing and completed status actions to a pipeline. Used by workers that require standard status reporting.

## Usage

```ts
import { injectStandardStatusActions } from "../core/status-actions";
```
