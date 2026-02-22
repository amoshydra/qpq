import type { Command } from '../types/command.js';

type SampleCommand = Omit<Command, 'id'>;

interface SampleConfig {
  commands: SampleCommand[];
  historyBufferSize?: number;
}

const sampleConfig: SampleConfig = {
  commands: [
    {
      name: 'Git Status',
      command: 'git status',
      description: 'Show git status',
      tags: ['git']
    },
    {
      name: 'Git Pull',
      command: 'git pull origin {branch}',
      description: 'Pull from remote branch',
      tags: ['git']
    },
    {
      name: 'Git Push',
      command: 'git push origin {branch}',
      description: 'Push to remote branch',
      tags: ['git']
    },
    {
      name: 'Docker Build',
      command: 'docker build -t {tag} .',
      description: 'Build Docker image with tag',
      tags: ['docker']
    },
    {
      name: 'Docker Run',
      command: 'docker run -it {image}',
      description: 'Run Docker container interactively',
      tags: ['docker']
    },
    {
      name: 'NPM Install',
      command: 'npm install {package}',
      description: 'Install npm package',
      tags: ['npm']
    },
    {
      name: 'List Files',
      command: 'ls -la',
      description: 'List all files with details',
      tags: ['system']
    },
    {
      name: 'Show Path',
      command: 'echo $PATH',
      description: 'Show PATH environment variable',
      tags: ['system']
    },
    {
      name: 'Disk Usage',
      command: 'df -h',
      description: 'Show disk usage',
      tags: ['system']
    }
  ]
};

export default sampleConfig;
