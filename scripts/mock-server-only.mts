/**
 * No-op stub so tsx test scripts can import server-only modules.
 * Used via: npx tsx --import ./scripts/mock-server-only.mts ...
 */
import Module from "node:module";

type LoadFn = (request: string, parent: NodeModule, isMain: boolean) => unknown;

const moduleHost = Module as typeof Module & { _load: LoadFn };
const originalLoad = moduleHost._load;

moduleHost._load = function mockServerOnlyLoad(
  request: string,
  parent: NodeModule,
  isMain: boolean,
): unknown {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
