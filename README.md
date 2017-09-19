# screeps-quorum

Screeps Quorum is a completely automated project centered around the game [Screeps](https://screeps.com/).

While there are other Screeps code bases which focus on automation, this is the first codebase which has automated its own management and deployment. The Quorum project does not have a single specific user behind it, but is completely independent.

All Pull Requests are done by volunteers, and the entire project is [open source](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/LICENSE).


## How does it work?

* Anyone can make a pull request. Developers can then vote on the pull requests using reactions (:+1:, :-1:, or :confused:). Pull requests which meet the [consensus rules](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/.gitconsensus.yaml) and pass all tests will be merged using [gitconsensus](https://pypi.python.org/pypi/gitconsensus).

* Any code that gets merged into master will automatically be uploaded to the Screeps main world under the user [Quorum](https://screeps.com/a/#!/profile/Quorum). Code is also deployed automatically once a day.

* If the [Quorum](https://screeps.com/a/#!/profile/Quorum) user is no longer spawned in the game it will be relaunched using the [ScreepsAutoSpawner](https://github.com/tedivm/ScreepsAutoSpawner). The AutoSpawner fork used by this project has its own [conensus rules](https://github.com/ScreepsQuorum/ScreepsAutoSpawner/blob/master/.gitconsensus.yaml) and is also automatically kept up to date.

* All of the Quorum data is public using [ScreepsDashboard](https://github.com/tedivm/ScreepsDashboard) and hosted at [quorum.tedivm.com](http://quorum.tedivm.com/). This includes full console output, all memory and segment data, and wallet history (with more feature being developed as needed).


## Resources

Join the discussion on slack at [#quorum](https://screeps.slack.com/messages/quorum/), available on the [Screeps Slack Network](http://chat.screeps.com/).

View the [Quorum Dashboard](http://quorum.tedivm.com/) for all the information on the currently running instance.


## Deploying

This codebase uses `Gulp` to deploy to the screeps server. It uses a configuration file, `.screeps.json`, which can save multiple configurations.

```json
{
  "main" : {
    "username": "Quorum",
    "password": "random123",
    "branch": "main"
  },
  "127.0.0.1" : {
    "username": "Quorum",
    "password": "random123"
  },
  "myserver.example.com" : {
    "username": "Quorum",
    "password": "random123",
    "secure": true
  }
}
```

By default `Gulp` will deploy to the `main` server, but this can be changed with the `server` flag.

```
gulp --server=127.0.0.1
```

By default gulp will push to the `sim` branch. This can be changed in the configuration file or by passing the `branch` option to gulp.
