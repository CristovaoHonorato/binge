'use strict'

const binge = require("../lib/index").default
const chalk = require("chalk")
const meow = require("meow")

const cli = meow([
  "Usage",
  "  $ binge [command]",
  "",
  "Commands:",
  "  build      Install, prepublish and connect outdated local packages (each step only for outdated)",
  "  watch      Same as build plus watch and connect local packages",
  "  status     Print a tree with the status of local packages",
  "  clean      Remove the node_modules directory from all local packages",
  "  run        TODO - Run npm script in each package",
  "  exec       TODO - Run a command in each package",
  "  harmony    TODO - Print a tree with all non harmonized dependencies",
  "  ls         List all local packages",
  "",
  "Options:",
  "  --skip-install       TODO Skip the install step ('build' and 'watch' commands only)",
  "  --skip-prepublish    TODO Skip the prepublish step ('build' and 'watch' commands only)",
  "  --skip-connect       TODO Skip the connect step ('build' and 'watch' commands only)",
  //"  --ignore [glob]      Ignores packages with names matching the given glob (Works only in combination with the 'bootstrap' command).",
  //"  --yes                Skip all confirmation prompts",
  "  --concurrency        How many threads to use if binge parallelises the tasks (defaults to 4)",
  "  --loud               TODO Output all available inforomation",
  "  --social (default)   TODO Output information about the current task and current step",
  "  --quiet              TODO Output only the final timing-success-failure statement",
  "  --silent             TODO No outputs"
], {
  alias: {

  }
})

require("signal-exit").unload()


const commandName = cli.input[0]
const command = binge[commandName]

if (!command) {
    if (commandName) {
        console.log(chalk.red("Invalid binge command: " + commandName))
    }

    cli.showHelp()
} else {
    console.time("execution")
    process.on("exit", () => console.timeEnd("execution"))
    command(cli.input.slice(1), cli.flags)
}
