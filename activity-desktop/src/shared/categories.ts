// App categorization rules extracted from activity-agent/config.json
// Each rule: { match: regex pattern string, category: string }

export interface CategoryRule {
  match: string;
  category: string;
}

export const DEFAULT_CATEGORIES: CategoryRule[] = [
  { match: '(?:code|cursor|qoder|devenv|vs(?:code)?|rider|idea64|webstorm64|phpstorm64|pycharm64|goland64|clion64|rustrover64|fleet|zed|sublime_text|notepad\\+\\+|atom|brackets|lapce|helix)\\.exe$', category: 'coding' },
  { match: '(?:WindowsTerminal|wt|powershell|pwsh|cmd|bash|mintty|conhost|alacritty|wezterm-gui|hyper|tabby|terminus)\\.exe$', category: 'coding' },
  { match: '(?:git|git-bash|GitHubDesktop|gitkraken|smartgit|tortoisegitproc|sourcetree)\\.exe$', category: 'coding' },
  { match: '(?:dbeaver|DataGrip64|pgadmin4|mysql|psql|mongosh|redis-cli|Robo3T|studio3t|tableplus|beekeeper-studio)\\.exe$', category: 'coding' },
  { match: '(?:docker|docker-compose|podman|kubectl|k9s|lens|terraform|vagrant|packer)\\.exe$', category: 'devops' },
  { match: '(?:chrome|firefox|msedge|brave|vivaldi|opera|arc|waterfox|librewolf|thorium)\\.exe$', category: 'browser' },
  { match: '(?:slack|discord|telegram|signal|teams|zoom|webex|skype|element|guilded|revolt|whatsapp)\\.exe$', category: 'comms' },
  { match: '(?:Zoom|zoom|ms-teams|Teams)\\.exe$', category: 'meetings' },
  { match: '(?:notion|obsidian|logseq|roam|anytype|trello|todoist|ticktick|asana|jira|linear|clickup)\\.exe$', category: 'productivity' },
  { match: '(?:WINWORD|EXCEL|POWERPNT|OUTLOOK|ONENOTE|MSACCESS|mspub|visio|thunderbird|eM Client)\\.exe$', category: 'office' },
  { match: '(?:photoshop|illustrator|InDesign|Lightroom|Acrobat|AffinityPhoto2|AffinityDesigner2|gimp-\\d|krita|inkscape|Figma|figma_agent|Lunacy|Penpot|canva)\\.exe$', category: 'design' },
  { match: '(?:blender|Unity|Unreal|Cinema 4D|3dsmax|maya|houdini|ZBrush|Substance)\\.exe$', category: 'design' },
  { match: '(?:obs64|obs32|streamlabs|Streamlabs OBS|XSplit|wirecast)\\.exe$', category: 'media' },
  { match: '(?:spotify|iTunes|Music|vlc|mpv|foobar2000|winamp|musicbee|aimp|audacity|Audition|reaper|ableton|fl64|bitwig)\\.exe$', category: 'media' },
  { match: '(?:steam|steamwebhelper|epicgameslauncher|GalaxyClient|Battle\\.net|RiotClientServices|Origin|Uplay|lutris)\\.exe$', category: 'games' },
  { match: '(?:explorer|Taskmgr|mmc|regedit|devmgmt|diskmgmt|perfmon|resmon|msconfig|SystemSettings)\\.exe$', category: 'system' },
  { match: '(?:7zFM|WinRAR|totalcmd64|totalcmd|Everything|dopus|FreeCommander64|MultiCommander|QDir)\\.exe$', category: 'utilities' },
];
