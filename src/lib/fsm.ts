export type StateName = string;

export interface State<TContext> {
  name: StateName;
  onEnter?: (context: TContext) => void;
  onUpdate?: (context: TContext, dt: number) => void;
  onExit?: (context: TContext) => void;
  transitions: Record<string, StateName>;
}

export class FiniteStateMachine<TContext> {
  private states: Map<StateName, State<TContext>> = new Map();
  private currentState: State<TContext> | null = null;
  private context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  addState(state: State<TContext>) {
    this.states.set(state.name, state);
  }

  start(initialStateName: StateName) {
    const state = this.states.get(initialStateName);
    if (!state) throw new Error(`State ${initialStateName} not found`);
    
    this.currentState = state;
    if (this.currentState.onEnter) {
      this.currentState.onEnter(this.context);
    }
  }

  transition(event: string) {
    if (!this.currentState) return;

    const nextStateName = this.currentState.transitions[event];
    if (!nextStateName) return; // No transition defined for this event

    const nextState = this.states.get(nextStateName);
    if (!nextState) throw new Error(`State ${nextStateName} not found`);

    if (this.currentState.onExit) {
      this.currentState.onExit(this.context);
    }

    this.currentState = nextState;

    if (this.currentState.onEnter) {
      this.currentState.onEnter(this.context);
    }
  }

  update(dt: number) {
    if (this.currentState && this.currentState.onUpdate) {
      this.currentState.onUpdate(this.context, dt);
    }
  }

  getCurrentStateName(): StateName | null {
    return this.currentState ? this.currentState.name : null;
  }
}
