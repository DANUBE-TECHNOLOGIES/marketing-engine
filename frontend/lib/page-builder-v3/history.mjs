import { clone } from "./sdk/index.mjs";

export class EditorHistory {
  constructor(initialState, limit = 50) {
    this.limit = Math.max(
      1,
      Number(limit) || 50
    );

    this.present = clone(initialState);
    this.past = [];
    this.future = [];
  }

  current() {
    return clone(this.present);
  }

  commit(nextState) {
    this.past.push(clone(this.present));

    if (this.past.length > this.limit) {
      this.past.shift();
    }

    this.present = clone(nextState);
    this.future = [];

    return this.current();
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  undo() {
    if (!this.canUndo()) {
      return this.current();
    }

    this.future.unshift(
      clone(this.present)
    );

    this.present = this.past.pop();

    return this.current();
  }

  redo() {
    if (!this.canRedo()) {
      return this.current();
    }

    this.past.push(
      clone(this.present)
    );

    this.present = this.future.shift();

    return this.current();
  }

  reset(state) {
    this.present = clone(state);
    this.past = [];
    this.future = [];

    return this.current();
  }
}
