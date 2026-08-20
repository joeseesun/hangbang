import { globalIgnores } from 'eslint/config'
import { eslintPresets } from '@lark-apaas/coding-presets-react'

export default [
  globalIgnores(['dist', 'source_package', '**/components/ui/**']),
  ...eslintPresets.client,
]
