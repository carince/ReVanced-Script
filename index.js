import { execa, execaCommand } from 'execa'
import figlet from 'figlet'
import fs from 'fs'
import { Listr } from 'listr2'
import open from 'open'
import enquirer from 'enquirer'

console.clear()
console.log(figlet.textSync(`ReVanced-Script`))

const main = new Listr(
    [
        {
            title: `Checking some stuff before we continue...`,
            task: () => new Listr(
                [
                    {
                        title: 'Do we have internet?',
                        task: async () => {
                            await execa('ping', ['-c 1', 'google.com'])
                        }
                    },
                    {
                        title: 'Is curl installed?',
                        task: async () => {
                            await execa('curl', ['--version']).catch()
                        }
                    },
                    {
                        title: 'Is Zulu JDK installed?',
                        task: async () => {
                            const { stdout } = await execa('java', ['--version'])

                            if (stdout) {
                                const string = stdout
                                if (!string.includes(`Zulu17`)) {
                                    await open('https://www.azul.com/downloads/?version=java-17-lts&package=jdk')
                                    throw new Error(`Zulu17 is not installed, check your browser and download the file according to your OS.`)
                                }
                            }
                        }
                    }
                ],
                {concurrent: true}
            )
        },
        {
            title: `Download needed packages...`,
            task: () => new Listr(
                [
                    {
                        title: `Do we already have the files downloaded?`,
                        options: { persistentOutput: true },
                        task: (ctx, task) => {
                            const dlFiles = []
                            if(!fs.existsSync(`./cli.jar`)) dlFiles.push(`cli`), ctx.dlCli = true
                            if(!fs.existsSync(`./patches.jar`)) dlFiles.push(`patches`), ctx.dlPatches = true
                            if(!fs.existsSync(`./integ.apk`)) dlFiles.push(`integrations`), ctx.dlInteg = true

                            if (dlFiles.length == 0) {
                                task.output = `Detected all file(s), skipping download.`
                            }

                            if (dlFiles.length > 0) {
                                task.skip(`Missing ${dlFiles.length} file(s), will be downloading the following: ${dlFiles}`)
                            }
                        }
                    },
                    {
                        title: `CLI`,
                        enabled: (ctx) => ctx.dlCli == true,
                        task: async (ctx, task) => {
                            const { stdout } = await execa('curl', ['-s', 'https://api.github.com/repos/revanced/revanced-cli/releases/latest'])
                            const json = JSON.parse(stdout)
                            const version = json[`tag_name`].substring(1)

                            await execa('curl', ['-Locli.jar', `https://github.com/revanced/revanced-cli/releases/download/v${version}/revanced-cli-${version}-all.jar`])
                        }
                    },
                    {
                        title: `Patches`,
                        enabled: (ctx) => ctx.dlPatches == true,
                        task: async () => {
                            const { stdout } = await execa('curl', ['-s', 'https://api.github.com/repos/revanced/revanced-patches/releases/latest'])
                            const json = JSON.parse(stdout)
                            const version = json[`tag_name`].substring(1)

                            await execa('curl', ['-Lopatches.jar', `https://github.com/revanced/revanced-patches/releases/download/v${version}/revanced-patches-${version}.jar`])
                        }
                    },
                    {
                        title: `Integrations`,
                        enabled: (ctx) => ctx.dlInteg == true,
                        task: async () => {
                            await execa('curl', ['-Lointeg.apk', `https://github.com/revanced/revanced-integrations/releases/download/v0.27.0/app-release-unsigned.apk`])
                        }
                    },
                ]
            )
        },
        {
            title: `Configuring ReVanced options...`,
            task: () => new Listr(
                [
                    {
                        title: `YouTube APK`,
                        retry: 3,
                        task: async (ctx, task) => {
                            const prompt = await task.prompt(
                                {
                                    type: 'Input',
                                    message: 'What is your YouTube APK filename?',
                                    footer: ctx.apkPrompt || 'example: yt.apk',
                                    initial: 'yt.apk'
                                }
                            )

                            if(!fs.existsSync(prompt)) {
                                ctx.apkPrompt = `File doesnt exist. Maybe check your spelling?`
                                throw new Error(`File doesnt exist.`)
                            } else {
                                ctx.ytDir = prompt
                            }
                        }
                    },
                    {
                        title: `ReVanced Patches`,
                        task: async (ctx, task) => {
                            const { stdout } = await execaCommand(`java -jar cli.jar -a ${ctx.ytDir} -c -l -o revanced.apk -b patches.jar -m integ.apk`)
                
                            let outputArr = stdout.toString().replace(/\r\n/g, '\n').split('\n')                      

                            let nameArr = outputArr.map(line => {
                                let cleaned = line.replaceAll('INFO:', '')
                                    cleaned = cleaned.replaceAll('"', "'")
                                    cleaned = cleaned.replaceAll(/\t/g, '   ')
                                return cleaned
                            })

                            let choicesArr = []
                            for (let name of nameArr) {
                                await choicesArr.push(JSON.parse(`{"name": "${name}"}`))
                            }

                            const prompt = await task.prompt(
                                {
                                    type: 'MultiSelect',
                                    name: `prompt`,
                                    message: 'Select the patches you want installed onto ReVanced',
                                    footer: 'Usage: Space for toggle, arrow keys for navigating, and Enter to confirm',
                                    choices: choicesArr
                                }
                            )

                            ctx.patchesArr = prompt.map(line => line.trim().split(' ')[0])
                        }
                    }
                ],
                { concurrent: false, injectWrapper: { enquirer } }
            )
        }
    ],
    {
        concurrent: false,
        rendererOptions: {
            collapse: false,
            collapseSkips: false
        }
    }
)

await main.run();