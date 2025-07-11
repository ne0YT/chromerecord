pkill -f deno || true
deno run --allow-net --allow-read --allow-write --allow-env --allow-run main.ts
