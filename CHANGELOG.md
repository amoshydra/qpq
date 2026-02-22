# Changelog

## [0.2.3](https://github.com/amoshydra/qpq/compare/v0.2.2...v0.2.3) (2026-02-22)


### Miscellaneous Chores

* release as 0.2.3 ([3fe024c](https://github.com/amoshydra/qpq/commit/3fe024c005836702d23fc6b7760b4e357d2217b3))

## [0.2.2](https://github.com/amoshydra/qpq/compare/v0.2.1...v0.2.2) (2026-02-22)


### Bug Fixes

* remove unused sample commands files and update documentation ([6d497d1](https://github.com/amoshydra/qpq/commit/6d497d1c49284717b125a97f5c354a35c69c03ee))

## [0.2.1](https://github.com/amoshydra/qpq/compare/v0.2.0...v0.2.1) (2026-02-22)


### Features

* add --help flag and error handling for unknown arguments ([8a0bb49](https://github.com/amoshydra/qpq/commit/8a0bb491185252b5c9dd4d45c7697f0ac052b61a))


### Bug Fixes

* resolve type error in config.ts and add husky pre-push hook ([f64c124](https://github.com/amoshydra/qpq/commit/f64c12405d1b96508878fc32893ae289c255c09c))
* show unified config path in --paths output ([929b110](https://github.com/amoshydra/qpq/commit/929b1109e2e4afcc6a608cbf3d3f1cc899277258))
* use dynamic import for bundled sample commands ([afa5191](https://github.com/amoshydra/qpq/commit/afa51911b118b0ea1aca2ecc120f8d002b214545))


### Miscellaneous Chores

* release as 0.2.1 ([2ffc1f0](https://github.com/amoshydra/qpq/commit/2ffc1f05f02f7d08626bdb6351cb9b997231777d))

## [0.2.0](https://github.com/amoshydra/qpq/compare/v0.1.2...v0.2.0) (2026-02-22)


### ⚠ BREAKING CHANGES

* Config storage format has changed from separate YAML/JSON files (fav.json, favorites.json, recent.json) to a single config.json file. Support for YAML configuration has been dropped. The application will automatically migrate existing data on first run.

### Features

* unify config storage into single file ([315583c](https://github.com/amoshydra/qpq/commit/315583cd110a1fc2fa220458d2fdf077afb9e7f3))


### Miscellaneous Chores

* release as 0.2.0 ([50186d5](https://github.com/amoshydra/qpq/commit/50186d5f9bda4c95b4a5a1d8ff49e7d66feb7910))

## [0.1.2](https://github.com/amoshydra/qpq/compare/v0.1.1...v0.1.2) (2026-02-21)


### Features

* **cli:** add configuration paths flag ([1c15d6a](https://github.com/amoshydra/qpq/commit/1c15d6aa82d2a554b23c6ae991a1176f168e3b85))
* **cli:** add version flag support ([ce21ae4](https://github.com/amoshydra/qpq/commit/ce21ae4288983cc9df87eedf3069cc5c1b34ae2a))
* **ui:** add fullscreen mode to CLI and index components ([72ec8c0](https://github.com/amoshydra/qpq/commit/72ec8c0c31adf53b1c0a7d9f953b3a9e399d0244))
* **ui:** add scrollable command history list ([dfdfede](https://github.com/amoshydra/qpq/commit/dfdfede6ab2eae3dee63292b20168f88e106f085))


### Bug Fixes

* replace fuse.js with simpler string search implementation ([73e0f97](https://github.com/amoshydra/qpq/commit/73e0f97278e8948854ca729b9a444bbe6d1e9997))
* **ui:** restore terminal cursor position after shell history capture ([815f805](https://github.com/amoshydra/qpq/commit/815f805f8c3defab2bb460e42ccf48458ce7ed05))
* **ui:** update command menu input handling ([b99af41](https://github.com/amoshydra/qpq/commit/b99af4175287dbb94e2f1a8a69c58dd51f406033))


### Miscellaneous Chores

* force patch release 0.1.2 ([3f78cd8](https://github.com/amoshydra/qpq/commit/3f78cd8958b72aafab64b62c5eee7f439083f04a))

## [0.1.1](https://github.com/amoshydra/qpq/compare/v0.1.0...v0.1.1) (2026-02-20)


### Performance Improvements

* optimize startup performance ([efd906c](https://github.com/amoshydra/qpq/commit/efd906ca333d02c9a4981f6da1e577ff3c202949))

## [0.1.0](https://github.com/amoshydra/qpq/compare/v0.0.11...v0.1.0) (2026-02-20)


### Features

* add arrow key navigation to command form ([046f389](https://github.com/amoshydra/qpq/commit/046f389bcaff438a6a8472f0612ec0150f5b7ee6))


### Bug Fixes

* only publish npm on release pr merge, add ci workflow ([5433ef5](https://github.com/amoshydra/qpq/commit/5433ef592a7d2883c4bc3960cb6b067125d40007))

## [0.0.11](https://github.com/amoshydra/qpq/compare/v0.0.10...v0.0.11) (2026-02-16)


### Performance Improvements

* optimize startup - parallelize file reads and lazy load components ([bfc4360](https://github.com/amoshydra/qpq/commit/bfc436038bdc0857179de3e9cf143d8e6710bfae))
* switch config from YAML to JSON with lazy migration ([d95fed9](https://github.com/amoshydra/qpq/commit/d95fed94e338d623c770875eedb6d927646a3f76))

## [0.0.10](https://github.com/amoshydra/qpq/compare/v0.0.9...v0.0.10) (2026-02-16)


### Bug Fixes

* use eval for shell built-ins, update FAQ ([211f9af](https://github.com/amoshydra/qpq/commit/211f9af2993993adc840c365fced337ca7692e51))

## [0.0.9](https://github.com/amoshydra/qpq/compare/v0.0.8...v0.0.9) (2026-02-16)


### Bug Fixes

* remove stdout redirect so Ink UI displays ([4daca4b](https://github.com/amoshydra/qpq/commit/4daca4bac5a41614b6d71457d710db14d1c0a3e8))

## [0.0.8](https://github.com/amoshydra/qpq/compare/v0.0.7...v0.0.8) (2026-02-16)


### Bug Fixes

* capture stderr separately to show Ink UI ([67288bf](https://github.com/amoshydra/qpq/commit/67288bf4fbe7e8bcdaddcd41743f6299e7934066))

## [0.0.7](https://github.com/amoshydra/qpq/compare/v0.0.6...v0.0.7) (2026-02-16)


### Bug Fixes

* resolve symlink path for npm-installed binary ([8101596](https://github.com/amoshydra/qpq/commit/81015964ee69724a202305cdf9f200f70d0742a6))

## [0.0.6](https://github.com/amoshydra/qpq/compare/v0.0.5...v0.0.6) (2026-02-16)


### Bug Fixes

* resolve dist path relative to script location ([855f492](https://github.com/amoshydra/qpq/commit/855f492900e703147aaf8aa2c055b9cba0459aa4))

## [0.0.5](https://github.com/amoshydra/qpq/compare/v0.0.4...v0.0.5) (2026-02-16)


### Bug Fixes

* **execution:** use wrapper script with exec for terminal handoff ([2037310](https://github.com/amoshydra/qpq/commit/203731000e97789b649261da3b7a41656b21be43))

## [0.0.4](https://github.com/amoshydra/qpq/compare/v0.0.3...v0.0.4) (2026-02-16)


### Bug Fixes

* **execution:** ensure proper terminal handoff for interactive commands ([5aed65f](https://github.com/amoshydra/qpq/commit/5aed65f2e27d330d8f7472049af423961b3408ee))
