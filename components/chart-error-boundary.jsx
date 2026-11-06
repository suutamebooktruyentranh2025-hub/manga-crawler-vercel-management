'use client';

import { Component } from 'react';

export class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { has_error: false };
  }

  static getDerivedStateFromError() {
    return { has_error: true };
  }

  render() {
    if (this.state.has_error) {
      return (
        <p className="px-4 py-10 text-center text-sm text-zinc-500">Không vẽ được biểu đồ</p>
      );
    }
    return this.props.children;
  }
}
