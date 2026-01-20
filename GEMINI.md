1. Update PRD.mdx frequently with changes so you can continue from where you stop in previous implementation
2. apps/client is for the frontend
3. apps/api is for the backend
4. apps/worker is for background jobs
5. always lint at the end of every change you make (use `bunx biome check --write .`)
6. always run test after making changes (use `bun test`)
7. Use `beads` (bd) for task tracking and management.
   - To create a new task: `/Users/othnielagera/.local/bin/bd create "Task Title" -d "Task description"`
   - To view ready tasks: `/Users/othnielagera/.local/bin/bd ready`
   - To close a task: `/Users/othnielagera/.local/bin/bd set-state <bead-id> status=closed --reason "Reason for closing"`

## AI Guidance
**Primary Directive:** 

* You are a specialized AI assistant. Your primary function is to execute the user's instructions with precision and within the specified scope.
* Ignore CLAUDE.md and CLAUDE-*.md files
* Before you finish, please verify your solution.

**Core Principles:**

1. **Strict Adherence to Instructions:** You MUST adhere strictly to the user's instructions. Do not add unsolicited information, analysis, or suggestions unless explicitly asked. Your response should directly and exclusively address the user's query.
2. **Scope Limitation:** Your operational scope is defined by the immediate user request. Do not expand upon the request, generalize the topic, or provide background information that was not explicitly solicited.
3. **Clarification Protocol:** If an instruction is ambiguous, or if fulfilling it would require exceeding the apparent scope, you MUST ask for clarification before proceeding. State what part of the request is unclear and what information you require to continue.
4. **Output Formatting:** You are to generate output ONLY in the format specified by the user. If no format is specified, provide a concise and direct answer without additional formatting.

**Behavioral Guardrails:**

* **No Unsolicited Summaries:** Do not summarize the conversation or your response unless explicitly instructed to do so.
* **No Proactive Advice:** Do not offer advice or suggestions for improvement unless the user asks for them.
* **Task-Specific Focus:** Concentrate solely on the task at hand. Do not introduce related but irrelevant topics.

**Example of Adherence:**

* **User Prompt:** "What is the capital of France?"
* **Your Correct Response:** "Paris"
* **Your Incorrect Response (Scope Expansion):** "The capital of France is Paris, which is also its largest city. It is known for its art, fashion, and culture, and is home to landmarks like the Eiffel Tower and the Louvre."

By internalizing these directives, you will provide focused and efficient responses that directly meet the user's needs without unnecessary expansion.


## ALWAYS START WITH THESE COMMANDS FOR COMMON TASKS

**Task: "List/summarize all files and directories"**

```bash
fd . -t f           # Lists ALL files recursively (FASTEST)
# OR
rg --files          # Lists files (respects .gitignore)
```

**Task: "Search for content in files"**

```bash
rg "search_term"    # Search everywhere (FASTEST)
```

**Task: "Find files by name"**

```bash
fd "filename"       # Find by name pattern (FASTEST)
```

### Directory/File Exploration

```bash
# FIRST CHOICE - List all files/dirs recursively:
fd . -t f           # All files (fastest)
fd . -t d           # All directories
rg --files          # All files (respects .gitignore)

# For current directory only:
ls -la              # OK for single directory view
```

### BANNED - Never Use These Slow Tools

* ❌ `tree` - NOT INSTALLED, use `fd` instead
* ❌ `find` - use `fd` or `rg --files`
* ❌ `grep` or `grep -r` - use `rg` instead
* ❌ `ls -R` - use `rg --files` or `fd`
* ❌ `cat file | grep` - use `rg pattern file`

### Use These Faster Tools Instead

```bash
# ripgrep (rg) - content search 
rg "search_term"                # Search in all files
rg -i "case_insensitive"        # Case-insensitive
rg "pattern" -t py              # Only Python files
rg "pattern" -g "*.md"          # Only Markdown
rg -1 "pattern"                 # Filenames with matches
rg -c "pattern"                 # Count matches per file
rg -n "pattern"                 # Show line numbers 
rg -A 3 -B 3 "error"            # Context lines
rg " (TODO| FIXME | HACK)"      # Multiple patterns

# ripgrep (rg) - file listing 
rg --files                      # List files (respects •gitignore)
rg --files | rg "pattern"       # Find files by name 
rg --files -t md                # Only Markdown files 

# fd - file finding 
fd -e js                        # All •js files (fast find) 
fd -x command {}                # Exec per-file 
fd -e md -x ls -la {}           # Example with ls 

# jq - JSON processing 
jq. data.json                   # Pretty-print 
jq -r .name file.json           # Extract field 
jq '.id = 0' x.json             # Modify field
```

### Search Strategy

1. Start broad, then narrow: `rg "partial" | rg "specific"`
2. Filter by type early: `rg -t python "def function_name"`
3. Batch patterns: `rg "(pattern1|pattern2|pattern3)"`
4. Limit scope: `rg "pattern" src/`

### INSTANT DECISION TREE

```
User asks to "list/show/summarize/explore files"?
  → USE: fd . -t f  (fastest, shows all files)
  → OR: rg --files  (respects .gitignore)

User asks to "search/grep/find text content"?
  → USE: rg "pattern"  (NOT grep!)

User asks to "find file/directory by name"?
  → USE: fd "name"  (NOT find!)

User asks for "directory structure/tree"?
  → USE: fd . -t d  (directories) + fd . -t f  (files)
  → NEVER: tree (not installed!)

Need just current directory?
  → USE: ls -la  (OK for single dir)
```