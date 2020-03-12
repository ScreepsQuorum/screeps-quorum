# Contributing to Screeps Quorum

👍🎉 First off, thanks for taking the time to contribute! 🎉👍


## How Can I Contribute?

### Documentation

The [developer wiki](https://github.com/ScreepsQuorum/screeps-quorum/wiki) is completely community run, and documentation contributions are always appreciated.


### Reporting Bugs and Suggesting Enhancements

Bug Reports and Feature Requests are extremely important to a project like this. As it is completely volunteer run, with no leaders, it's important to give people projects they can use to jump right into the code base. When submitting a new issue please take care to -

* Prefix the title of feature requests with `[feature]` and bug reports with `[bug]`. This will ensure the automated system labels them appropriately. Issues that do not start with one of these prefixes may get automatically closed.
* make sure it isn't a duplicate, and if you do find an existing ticket please add more detail to that ticket,
* add as much detail as is needed to either replicate the issue or fully build out the new feature.


### Planning Things Out

This is an extremely collaborative project. The larger a feature is the more potential it has for disruption. When planning large features it's important to talk things out in the slack channel or open an Issue on Github to solicit feedback.


### Pull Requests

**Any pull request that gets accepted will be deployed to the screeps server within moments of being merged.**

**Do not submit pull requests that are not ready to deploy.**

Please make sure you test all of your changes. This can be done with the in game simulator, a private server, or one of the many public servers available. If you need help please join us in slack for help.

Pull requests are accepted by votes, which depend on the [consensus rules](https://github.com/ScreepsQuorum/ScreepsAutoSpawner/blob/master/.gitconsensus.yaml) of the project. You are allowed to vote for your own pull requests.

This project follows the [standardjs](https://standardjs.com/) code style. This is tested for by the Quorum continuous integration system (currently CircleCI) and any pull requests which do not follow this standard will not be merged regardless of votes.


### Third Party Services

When creating a pull request that provide integration with outside services (continuous integration, code style checks, notifications, stats, etc) make a separate issue description how to integrate with that service so a project curator can provide the necessary infrastructure.
