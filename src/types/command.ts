export interface Command {
  name: string;
  command: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
}

export interface Config {
  commands: Command[];
}