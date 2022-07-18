import { execa } from 'execa'
import figlet from 'figlet'
import Listr from 'listr'

console.clear()
console.log(figlet.textSync(`ReVanced-Script`))

const main = new Listr([
    {
        title: 'Checking some stuff before we continue',
        task: () => {
            return new Listr([
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
                        const {stdout} = await execa('java', ['--version'])

                        if(stdout){
                            const string = stdout
                            if(string.includes(`Zulu17`)){
                                throw new Error(`zulu17 is not installed`)
                            }
                        }
                    }
                },
            ], {concurrent: 1});
        }
    }
]);

main.run()