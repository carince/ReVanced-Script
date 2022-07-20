import figlet from 'figlet'
import ora from 'ora'
import { execa, execaCommand } from 'execa'
import chalk from 'chalk'
import inquirer from 'inquirer'
import gradient from 'gradient-string'

import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
const { textSync } = figlet

const __dirname = dirname(fileURLToPath(import.meta.url))
const filesDir = join(__dirname, `rvs-files`)
let ytName;
let rvName;
let patchArr = new Array();

await console.clear()
const rvGradient = gradient(['#bb2ea1', '#ebf92b'])
console.log(rvGradient(textSync(`ReVanced-Script`)))

async function main() {
    console.log(chalk.bold.green(`Checks`))
    async function mkdir() {
        const spinner = ora(`Create a directory for our files to sit in...`).start()

        if (!existsSync(filesDir)) {
            mkdirSync(filesDir);
            spinner.succeed(chalk.greenBright(`Created files directory.`))
        } else {
            spinner.warn(chalk.yellowBright(`Files directory already exists, ${chalk.italic(`skipping...`)}`))
        }
    } await mkdir()

    async function checkJava() {
        const spinner = ora(`Checking if Zulu JDK 17 is installed...`).start()

        const { stdout } = await execa('java', ['--version']).catch(() => {
            const errTxt = `Java is not installed.`
            spinner.fail(chalk.bold.red(errTxt))
            throw new Error(errTxt)
        })

        if (!stdout.includes(`Zulu`)) {
            const errTxt = `Zulu is not installed.`
            spinner.fail(chalk.bold.red(errTxt))
            throw new Error(errTxt)
        }

        if (!stdout.includes(`Zulu17`)) {
            const errTxt = `Zulu is installed but with a incorrect version.`
            spinner.fail(chalk.bold.red(errTxt))
            throw new Error(errTxt)
        }

        spinner.succeed(chalk.greenBright(`Zulu JDK is installed...`))
    } await checkJava()

    async function checkCurl() {
        const spinner = ora(`Checking if curl is installed...`).start()

        await execa('curl', [`--version`]).catch(() => {
            const errTxt = `Curl is not installed.`
            spinner.fail(chalk.bold.red(errTxt))
            throw new Error(errTxt)
        })

        spinner.succeed(chalk.greenBright(`curl is installed...`))
    } await checkCurl()

    console.log(chalk.bold.green(`Downloads`))
    async function dlPkg() {
        await cli()
        async function cli() {
            const spinner = ora(`Downloading CLI...`).start()

            if (existsSync(join(filesDir, `cli.jar`))) {
                spinner.warn(chalk.yellowBright(`CLI already exists, ${chalk.italic(`skipping...`)}`))
                return
            }

            const { stdout } = await execa('curl', ['-s', 'https://api.github.com/repos/revanced/revanced-cli/releases/latest'])
            const json = JSON.parse(stdout)
            const version = json[`tag_name`].substring(1)

            await execa('curl',
                [
                    '-Locli.jar',
                    `https://github.com/revanced/revanced-cli/releases/download/v${version}/revanced-cli-${version}-all.jar`
                ],
                {
                    cwd: filesDir
                }
            )

            spinner.succeed(chalk.greenBright(`CLI successfully downloaded...`))
        }

        await patches()
        async function patches() {
            const spinner = ora(`Downloading Patches...`).start()

            if (existsSync(join(filesDir, `patches.jar`))) {
                spinner.warn(chalk.yellowBright(`Patches already exists, ${chalk.italic(`skipping...`)}`))
                return
            }

            const { stdout } = await execa('curl', ['-s', 'https://api.github.com/repos/revanced/revanced-patches/releases/latest'])
            const json = JSON.parse(stdout)
            const version = json[`tag_name`].substring(1)

            await execa('curl',
                [
                    '-Lopatches.jar',
                    `https://github.com/revanced/revanced-patches/releases/download/v${version}/revanced-patches-${version}.jar`
                ],
                {
                    cwd: filesDir
                }
            )

            spinner.succeed(chalk.greenBright(`Patches successfully downloaded...`))
        }

        await integ()
        async function integ() {
            const spinner = ora(`Downloading Integrations...`).start()

            if (existsSync(join(filesDir, `integ.apk`))) {
                spinner.warn(chalk.yellowBright(`Integrations already exists, ${chalk.italic(`skipping...`)}`))
                return
            }

            await execa('curl',
                [
                    '-Lointeg.apk',
                    `https://github.com/revanced/revanced-integrations/releases/download/v0.27.0/app-release-unsigned.apk`
                ],
                {
                    cwd: filesDir
                }
            )

            spinner.succeed(chalk.greenBright(`Integrations successfully downloaded...`))
        }
    } await dlPkg()

    console.log(chalk.bold.green(`Configuration`))
    async function configure() {
        async function ytApk() {
            await inquirer.prompt(
                {
                    type: `input`,
                    name: `ytApk`,
                    message: `What is your YouTube apk filename?\n  ${chalk.italic(`(file must be in the 'rvs-files' directory.)`)}\n  rvs-files: file://${filesDir}`,
                    default: `yt.apk`,
                    validate: function (input) {
                        const done = this.async();
                        async function checkFile() {
                            if (!existsSync(join(filesDir, input))) {
                                done(chalk.yellowBright(`⚠ File does not exist, please double check your spelling.`))
                                return
                            } else {
                                ytName = input
                                done(null, true)
                            }
                        } checkFile();
                    }
                }
            )
        } await ytApk()

        async function slctPatches() {
            const { stdout } = await execaCommand(`java -jar cli.jar -a ${ytName} -c -l -o revanced.apk -b patches.jar -m integ.apk`,
                {
                    cwd: filesDir
                }
            )

            let outputArr = stdout.toString().replace(/\r\n/g, '\n').split('\n')

            let nameArr = outputArr.map(line => {
                let cleaned = line.replaceAll('INFO:', '')
                cleaned = cleaned.replaceAll('"', "'")
                cleaned = cleaned.replaceAll(/\t/g, '   ')
                return cleaned
            })

            let choicesArr = []
            for (let name of nameArr) {
                const value = name.trim().split(' ')[0]
                await choicesArr.push(JSON.parse(`{"name": "${name}", "value": "${value}", "short": "${value}"}`))
            }

            await inquirer.prompt(
                {
                    type: `checkbox`,
                    name: `patchArr`,
                    message: `Select your preferred patches.`,
                    pageSize: 15,
                    choices: choicesArr,
                    validate: function (input) {
                        const done = this.async();
                        async function check() {
                            if (!input.length > 0) {
                                done(chalk.yellowBright(`⚠ You must pick atleast one of the patches.`))
                                return
                            }
                            patchArr = input
                            done(null, true)
                        } check();
                    }
                }
            )
        } await slctPatches()

        async function apkName() {
            await inquirer.prompt(
                {
                    type: `input`,
                    name: `apkName`,
                    message: `What would you like your ReVanced apk be named?\n  (spaces and '.apk' will be removed.)`,
                    default: `revanced`,
                    validate: function (input) {
                        const done = this.async();
                        async function check() {
                            let name = input.replaceAll(` `, '')

                            if (!name) {
                                done(chalk.yellowBright(`⚠ Name cannot be empty`))
                                return
                            }
                            if (name.endsWith(`.apk`)) {
                                name.replace(`.apk`, ``)
                            }

                            rvName = name
                            done(null, true)
                        } check();
                    }
                }
            )
        } await apkName()
    } await configure()
} main();