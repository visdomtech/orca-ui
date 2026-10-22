# Changelog

## [1.1.1](https://github.com/visdomtech/orca-ui/compare/v1.1.0...v1.1.1) (2026-10-22)


### Bug Fixes

* restore *.css in sideEffects so esbuild includes CSS injection ([26529b1](https://github.com/visdomtech/orca-ui/commit/26529b12328e76d7bc59039124d36d287b5b7c3f))

## [1.1.0](https://github.com/visdomtech/orca-ui/compare/v1.0.4...v1.1.0) (2026-10-22)


### Features

* add UsersAccess component with role management, audit, and auto-injected Tailwind styles ([6a11b1f](https://github.com/visdomtech/orca-ui/commit/6a11b1f8bd460498a56ba668940db3e453037f88))

## [1.0.4](https://github.com/visdomtech/orca-ui/compare/v1.0.3...v1.0.4) (2026-10-22)


### Bug Fixes

* add "github:visdomtech/orca-ui" ([a1329de](https://github.com/visdomtech/orca-ui/commit/a1329de39eee578f7fceef456346bf9ca299e7fc))

## [1.0.3](https://github.com/visdomtech/orca-ui/compare/v1.0.2...v1.0.3) (2026-10-22)


### Bug Fixes

* remove cache to avoid requiring xxx-lock to compute a cache key ([acae7d5](https://github.com/visdomtech/orca-ui/commit/acae7d5281cfdd721fc4b3bdc1f5fe842b04703d))

## [1.0.2](https://github.com/visdomtech/orca-ui/compare/v1.0.1...v1.0.2) (2026-10-22)


### Bug Fixes

* upgrade node version to support trusted publisher ([f441632](https://github.com/visdomtech/orca-ui/commit/f4416321e1c98d241714b046d28d6cc69ee4c248))

## [1.0.1](https://github.com/visdomtech/orca-ui/compare/v1.0.0...v1.0.1) (2026-10-22)


### Bug Fixes

* Release-As: 1.0.1 ([4a4fcc3](https://github.com/visdomtech/orca-ui/commit/4a4fcc38db3705533ab5d5a283849b73b3edb4ac))
* use secret RELEASE_PAT ([e3112e0](https://github.com/visdomtech/orca-ui/commit/e3112e0c43a372b619c3981165acefa9d2d27ecb))

## 1.0.0 (2026-10-22)


### Features

* add liquid metal kit components (GradientText, GlassCard, AmbientBackground) ([3a83db2](https://github.com/visdomtech/orca-ui/commit/3a83db2f0516c6fa31e88bd538c6e3165d3cff0a))
* enhance liquid metal visual impact (dramatic glass, specular chrome, vivid ambient) ([19725e8](https://github.com/visdomtech/orca-ui/commit/19725e8e00ac606b1785b1aefccc6cacec540ad4))
* orca-ui shared public liraries ([540b4ad](https://github.com/visdomtech/orca-ui/commit/540b4adb7b7de085d38deff0382685a62469350a))


### Bug Fixes

* add CSS variable fallbacks to GlassCard and bump to 0.5.0 ([53cdfa9](https://github.com/visdomtech/orca-ui/commit/53cdfa9c784f59212bde8253e31ec597bbdf68fd))
* add NPM_CONFIG_TOKEN to deploy workflow ([2439080](https://github.com/visdomtech/orca-ui/commit/243908076e6644b91812b936b7fc4ba65c3711af))
* add release-please ([#4](https://github.com/visdomtech/orca-ui/issues/4)) ([ca15818](https://github.com/visdomtech/orca-ui/commit/ca158186fd8422e5f8f894fa213cd20d0f2c0436))
* publish github workflow ([#1](https://github.com/visdomtech/orca-ui/issues/1)) ([49f8fa9](https://github.com/visdomtech/orca-ui/commit/49f8fa92e404cc45c7e57e3dfde00c37b4db5698))
* reorder exports field (types before import for TS resolution) ([da5e2b5](https://github.com/visdomtech/orca-ui/commit/da5e2b52c8084ec09d21c909059591ebf678a918))
* try `npm publish` instead of using `bun` ([6081be4](https://github.com/visdomtech/orca-ui/commit/6081be4794ebed26a8c662abb45c4a5f4b872ddf))
* use .npmrc for bun publish auth ([7224767](https://github.com/visdomtech/orca-ui/commit/7224767c5c80247c12ba5870cdbef3d3fb324458))


### Reverts

* restore deploy.yml to original state ([8dc069d](https://github.com/visdomtech/orca-ui/commit/8dc069d47c2d5c831fa8befed7ae6fee273940ec))
