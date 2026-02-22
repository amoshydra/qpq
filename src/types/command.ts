export interface Command {
  id: number;
  name: string;
  command: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
}

export interface Config {
  commands: Command[];
}