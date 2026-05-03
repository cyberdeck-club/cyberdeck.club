---
name: github-projects
description: Manage GitHub Projects (ProjectV2) using the GitHub MCP server. Use when needing to list projects, add issues/PRs to project boards, update project fields, or manage org/user project items. Keywords: github projects, project board, add issue to project, update project status, kanban.
---

# When to use

Use this skill when you need to:
- List GitHub Projects for a user or organization
- Get details about a specific project
- Add issues or pull requests to a project board
- Update project item fields (status, assignees, custom fields)
- Delete items from a project
- List project fields or items
- Create project status updates

# When NOT to use

- For classic Projects (v1) — only ProjectV2 is supported
- For repository-level operations (use standard GitHub MCP tools directly)
- When you need to manage project columns/rows directly — the MCP uses field updates instead

# Inputs required

- `owner`: The user or organization login (e.g., `cyberdeck-club`)
- `owner_type`: Either `user` or `org`
- `project_number`: The project's number (from the project URL)
- For write operations: item IDs, field IDs, and values

# Workflow

## 1. List projects for an owner

```json
{
  "method": "list_projects",
  "owner": "<owner>",
  "owner_type": "user|org"
}
```

## 2. Get project details

```json
{
  "method": "get_project",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>
}
```

## 3. List project fields (needed for updates)

```json
{
  "method": "list_project_fields",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>
}
```

Returns field IDs needed for `update_project_item`.

## 4. List project items

```json
{
  "method": "list_project_items",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>,
  "fields": ["<field_id>", "..."]
}
```

**Important**: Always provide `fields` array to get field values. Without it, only titles are returned.

## 5. Add an issue or PR to a project

```json
{
  "method": "add_project_item",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>,
  "item_type": "issue|pull_request",
  "item_owner": "<repo-owner>",
  "item_repo": "<repo-name>",
  "issue_number": <number>
}
```

## 6. Update a project item field

```json
{
  "method": "update_project_item",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>,
  "item_id": <item-id>,
  "updated_field": {
    "id": <field-id>,
    "value": "<new-value>"
  }
}
```

To clear a field, set `value` to `null`.

## 7. Delete a project item

```json
{
  "method": "delete_project_item",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>,
  "item_id": <item-id>
}
```

## 8. Create a project status update

```json
{
  "method": "create_project_status_update",
  "owner": "<owner>",
  "owner_type": "user|org",
  "project_number": <number>,
  "body": "<markdown>",
  "status": "ON_TRACK|AT_RISK|OFF_TRACK|COMPLETE|INACTIVE",
  "start_date": "YYYY-MM-DD",
  "target_date": "YYYY-MM-DD"
}
```

# Finding project numbers and field IDs

**Project number**: From the project URL
- `https://github.com/orgs/cyberdeck-club/projects/1` → project number is `1`

**Field ID**: From `list_project_fields` response
- Each field has an `id` (numeric string) used in updates

**Item ID**: From `list_project_items` response
- Each item has an `id` used for updates/deletes

# Troubleshooting

| Error | Solution |
|-------|----------|
| "not found as user or organization" | Verify owner name is correct; try omitting `owner_type` to auto-detect |
| "failed to list project fields" | Ensure project number is correct |
| "item_type must be either 'issue' or 'pull_request'" | Check the `item_type` parameter spelling |
| "invalid status" | Must be one of: `ON_TRACK`, `AT_RISK`, `OFF_TRACK`, `COMPLETE`, `INACTIVE` |
| Only titles returned | Always pass `fields` array in `list_project_items` |

# Example: Adding a cyberdeck.club issue to the org project

```json
{
  "method": "add_project_item",
  "owner": "cyberdeck-club",
  "owner_type": "org",
  "project_number": 1,
  "item_type": "issue",
  "item_owner": "cyberdeck-club",
  "item_repo": "cyberdeck.club",
  "issue_number": 42
}
```
