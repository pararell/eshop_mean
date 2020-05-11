declare var StripeCheckout:any;
declare var window: Window & typeof globalThis;
declare var module: NodeModule;
interface NodeModule {
  id: string;
}
declare var process: Process;
interface Process {
  [name: string] : any;
}
interface GlobalEnvironment {
  process: Process
}
