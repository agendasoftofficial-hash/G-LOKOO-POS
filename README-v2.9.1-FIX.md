# G-LOKOO POS v2.9.1 — Dashboard crash fix

Fixed the Dashboard 2.0 integration errors from v2.9.0:

- Defined `isManagement` inside `App` from the existing `canAdmin` role check.
- Passed `onNavigate` into the `Dashboard` component because Dashboard quick actions use it.
- No Supabase schema changes are required for this fix.

## Run

```bash
npm install
npm run dev
```

Do not copy the previous `node_modules` folder between Windows and another operating system. If dependencies are already installed on the PC, use them; otherwise run `npm install` in this project folder.
