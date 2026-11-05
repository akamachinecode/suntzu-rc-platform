# Container registries to create, one per image the deploy workflow builds.
locals {
  images = ["app", "api"]
}
