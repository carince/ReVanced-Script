import { execa } from 'execa'
import figlet from 'figlet'
import fs from 'fs'
import { Listr } from 'listr2'
import open from 'open'

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
                            await execa('ping', ['-c 5', 'google.com'])
                        }
                    },
                    {
                        title: 'Is curl installed?',
                        task: async () => {
                            await execa('curl', ['--version'])
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
                        task: (ctx, task) => {
                            const dlFiles = []
                            if(!fs.existsSync(`./cli.jar`)) dlFiles.push(`cli`), ctx.dlCli = true
                            if(!fs.existsSync(`./patches.jar`)) dlFiles.push(`patches`), ctx.dlPatches = true
                            if(!fs.existsSync(`./integrations.apk`)) dlFiles.push(`integrations`), ctx.dlInteg = true

                            if (dlFiles.length == 0) {
                                task.output = `Detected all file(s), skipping download.`
                            }

                            if (dlFiles.length > 0) {
                                task.skip(`Missing ${dlFiles.length} file(s), will be downloading the following: ${dlFiles}`)
                            }
                        },
                        options: { persistentOutput: true }
                    },
                    {
                        title: `CLI`,
                        enabled: (ctx) => ctx.dlCli == true,
                        task: async () => {
                            await execa('curl', ['-ocli.jar', 'https://github.com/revanced/revanced-cli/releases/download/v2.5.3/revanced-cli-2.5.3-all.jar'])
                        }
                    },
                    {
                        title: `Patches`,
                        enabled: (ctx) => ctx.dlPatches == true,
                        task: async () => {
                            await execa('curl', ['-opatches.jar', 'https://github.com/revanced/revanced-cli/releases/download/v2.5.3/revanced-cli-2.5.3-all.jar'])
                        }
                    },
                    {
                        title: `Integrations`,
                        enabled: (ctx) => ctx.dlInteg == true,
                        task: async () => {
                            await execa('curl', ['-ointeg.apk', 'https://github.com/revanced/revanced-cli/releases/download/v2.5.3/revanced-cli-2.5.3-all.jar'])
                        }
                    },
                ]
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