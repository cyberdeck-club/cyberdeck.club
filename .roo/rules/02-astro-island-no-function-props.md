# CRITICAL: Never Pass Functions as Props to Astro Islands

## This rule is NON-NEGOTIABLE. Violations cause silent runtime crashes.

Astro **cannot serialize functions** across the server→client boundary. When a React/Preact/Svelte/Vue component is rendered as an Astro island (`client:load`, `client:visible`, `client:only`, `client:idle`, `client:media`), all props are **serialized to JSON** and deserialized on the client. Functions are **silently dropped** and become `undefined`.

This means:

- `onChange` callbacks → `undefined`
- `onClick` handlers → `undefined`
- `onSubmit` callbacks → `undefined`
- `render` props (render functions) → `undefined`
- Any prop whose value is a function → `undefined`

The component will hydrate, briefly render, then **crash with an opaque minified error** like `TypeError: u is not a function` when the undefined function is called. This error is extremely difficult to debug in production.

## FORBIDDEN — Do NOT do this. Ever.

```astro
<!-- ❌ WILL CRASH — function props are silently dropped during serialization -->
<MyComponent client:load onChange={(data) => { doSomething(data); }} />
<MyComponent client:load onSubmit={handleSubmit} />
<MyComponent client:load render={(item) => <span>{item}</span>} />
<MyComponent client:visible callback={myFunction} />
```

## REQUIRED — Do this instead.

If a React island needs to communicate data outward (e.g., to an Astro `<script>` block or another part of the page):

1. **Write to `window` directly inside the component** — the component itself is the only code that runs on the client, so it should own the side effect:

```tsx
// ✅ Inside the React component
useEffect(() => {
  (window as any).__myComponentData = data;
}, [data]);
```

2. **Use CustomEvents** for more complex communication:

```tsx
// ✅ Inside the React component
useEffect(() => {
  window.dispatchEvent(new CustomEvent('my-component-change', { detail: data }));
}, [data]);
```

3. **If a callback prop is desired for reusability**, make it optional and guard every call site with optional chaining:

```tsx
// ✅ In the component's interface
interface Props {
  onChange?: (data: Data) => void;  // MUST be optional
}

// ✅ In the component's logic
onChange?.(data);  // MUST use optional chaining
```

## What CAN be passed as props to Astro islands

Only JSON-serializable values:

- ✅ Strings, numbers, booleans, null
- ✅ Plain objects (no methods, no class instances)
- ✅ Arrays of serializable values
- ✅ `undefined` (will be omitted)
- ❌ Functions (silently dropped → `undefined`)
- ❌ Dates (serialized as strings, not Date objects)
- ❌ Maps, Sets, RegExp, Error objects
- ❌ Class instances
- ❌ Symbols
- ❌ DOM nodes

## Why this keeps happening

LLMs (including this one) pattern-match from React documentation and examples where passing `onChange`, `onSubmit`, and callback props is standard practice. In a normal React app, this works fine. **In Astro islands, it silently breaks.** This rule exists because this specific mistake has been made multiple times and always results in a production crash that is difficult to diagnose.

## Enforcement

Before writing or reviewing ANY code that renders a framework component with a `client:*` directive in an `.astro` file:

1. **Check every prop** — is any prop a function? If yes, STOP.
2. **Move the logic into the component itself** — the component runs on the client and can do anything a callback would do.
3. **Make callback props optional** — if the component's TypeScript interface has callback props for reusability, they MUST be typed as optional (`?:`) and called with optional chaining (`?.()`) since they will be `undefined` when used as an Astro island.
