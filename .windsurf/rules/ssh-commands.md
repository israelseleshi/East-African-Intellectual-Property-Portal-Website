---
trigger: always_on
---
# SSH Command Restriction Rule

- **STRICT PROHIBITION**: NEVER execute `ssh` or any remote server commands using the `run_command` tool yourself.
- **PROCEDURE**: Always provide the full SSH command string in the chat for the USER to copy, paste, and run manually in their own terminal.
- **REASON**: The user prefers to maintain manual control over production server interactions and handle password prompts personally.
