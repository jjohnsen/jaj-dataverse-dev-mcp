---
name: review-mcp-session
title: Review Dataverse MCP Usage
description: Analyze how the Dataverse MCP and its tools were used in the current session and suggest concrete improvements.
---

Analyze how `jaj-dataverse-dev-mcp` and its MCP tools were used during the current session.

Focus only on evidence from this session. Do not invent tool calls, failures, or user intent.

## Analyze

For each relevant task:

1. What was the user trying to accomplish?
2. Which MCP tool(s) were used?
3. Were the correct tools selected?
4. Were the tool arguments correct?
5. Did the operation succeed on the first attempt?
6. Were retries, corrections, or alternative approaches needed?
7. Was `dataverse_request` used where a specialized tool would have been better?
8. Did the agent construct unnecessary or overly complex Web API requests?
9. Were tool descriptions or schemas unclear to the agent?
10. Were unnecessary tool calls made?
11. Was too much data returned?
12. Were there safety concerns around writes, deletes, production, or destructive operations?
13. Did the agent need information that the MCP could have provided more directly?

## Look for patterns

Identify:

- repeated Web API request patterns
- repeated sequences of MCP calls
- common Dataverse operations that deserve specialized tools
- missing validation
- missing confirmation flows
- unclear naming
- weak tool descriptions
- schema problems
- missing resources, prompts, or server instructions
- opportunities for caching or completion
- cases where the agent avoided the MCP or worked around it

## Evaluate each finding

For every improvement opportunity, provide:

- **Task**
- **Observed behavior**
- **Problem**
- **Likely root cause**
- **Recommended improvement**
- **Category**
  - tool description
  - input schema
  - output schema
  - specialized tool
  - generic Web API behavior
  - server instructions
  - resource
  - prompt
  - completion
  - caching
  - safety / confirmation
  - documentation
  - bug
- **Priority:** High / Medium / Low
- **Expected benefit**

## Create regression evals

For every High or Medium priority finding, create a concrete eval:

```text
Prompt:
<realistic user prompt>

Expected tool(s):
<tool names>

Expected behavior:
<what should happen>

Must not:
<undesired behavior>