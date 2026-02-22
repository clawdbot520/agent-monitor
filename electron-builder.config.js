export default {
  appId: 'com.openclaw.agent-monitor',
  productName: 'Agent Monitor',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'server/**/*',
    'package.json'
  ],
  asarUnpack: ['dist/**/*'],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [
      { target: 'dmg', arch: ['arm64', 'x64'] }
    ]
  }
}
