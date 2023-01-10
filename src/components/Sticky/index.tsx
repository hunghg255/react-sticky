import React, { PureComponent, CSSProperties } from 'react';

function getWindow(el: Document) {
  return el.nodeType === 9 && el.defaultView;
}

function offset(el: Element) {
  const doc = el?.ownerDocument;
  const docElem = doc.documentElement;
  const win: any = getWindow(doc);
  let box = { top: 0, left: 0 };

  if (!doc) {
    return {
      top: 0,
      left: 0,
    };
  }

  if (typeof el.getBoundingClientRect !== typeof undefined) {
    box = el.getBoundingClientRect();
  }

  return {
    top: box.top + win?.pageYOffset - docElem.clientTop,
    left: box.left + win?.pageXOffset - docElem.clientLeft,
  };
}

interface StickyProps {
  children: React.ReactNode | ((isSticky: boolean) => React.ReactNode);
  offsetTop: number;
  containerSelectorFocus: string;
  zIndex: number;
  stickyEnableRange: number[];
  onChange: (isSticky: boolean) => void;
}

interface StickyState {
  isEnableSticky: boolean;
  targetHeight: number;
  innerPosition: string;
  containerMeasure: Partial<DOMRect>;
  isLong: boolean;
  innerTop: number;
}

type StickyDefaultProps = Pick<
  StickyProps,
  'offsetTop' | 'containerSelectorFocus' | 'zIndex' | 'stickyEnableRange' | 'onChange'
>;

export default class Sticky extends PureComponent<StickyProps, StickyState> {
  private $container!: any;
  private $inner!: any;
  private prevScrollY!: number;
  private isPrevSticky?: boolean;

  public static defaultProps: StickyDefaultProps = {
    offsetTop: 0,
    containerSelectorFocus: 'body',
    zIndex: 10,
    stickyEnableRange: [0, Infinity],
    onChange: () => {},
  };

  public state: StickyState = {
    isEnableSticky: false,
    targetHeight: Infinity,
    innerPosition: 'static',
    containerMeasure: {},
    isLong: false,
    innerTop: 0,
  };

  public componentDidMount() {
    window.addEventListener('scroll', this.handleWindowScroll);
    this.handleWindowResize();
    window.addEventListener('resize', this.handleWindowResize);
  }

  public componentWillUnmount() {
    window.removeEventListener('scroll', this.handleWindowScroll);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  private getContainerSelectorFocus = () => {
    const { containerSelectorFocus } = this.props;
    return this.$container.closest(containerSelectorFocus);
  };

  private handleWindowResize = () => {
    const { stickyEnableRange } = this.props;
    const [min, max] = stickyEnableRange;
    this.setState({
      isEnableSticky: window.innerWidth >= min && window.innerWidth <= max,
    });
  };

  private handleWindowScroll = async () => {
    const { onChange } = this.props;
    const { isEnableSticky } = this.state;
    const isSticky = this.checkSticky();
    const $containerSelectorFocus = this.getContainerSelectorFocus();
    const { innerHeight: windowHeight } = window;
    if (this.$container && this.$inner && isEnableSticky) {
      const { clientHeight: innerHeight } = this.$inner;
      const containerMeasure = this.$container.getBoundingClientRect();
      const targetHeight = $containerSelectorFocus
        ? $containerSelectorFocus.clientHeight
        : Infinity;
      await this.setState({
        containerMeasure: {
          top: containerMeasure.top,
          left: containerMeasure.left,
          width: containerMeasure.width,
          height: innerHeight,
        },
        targetHeight,
        isLong: innerHeight > windowHeight,
      });
      if (innerHeight > windowHeight) {
        this.handleLong();
      } else {
        this.handleShort();
      }
      if (this.isPrevSticky !== isSticky) {
        onChange(isSticky);
      }
      this.isPrevSticky = isSticky;
    }
  };

  private checkWrapBottom = () => {
    const { offsetTop } = this.props;
    const $containerSelectorFocus = this.getContainerSelectorFocus();
    const { containerMeasure, isLong } = this.state;
    const targetHeight = $containerSelectorFocus ? $containerSelectorFocus.clientHeight : Infinity;
    return (
      (containerMeasure as any)?.top -
        (containerMeasure as any)?.height +
        (isLong ? (containerMeasure as any)?.height - window.innerHeight + offsetTop : 0) -
        offsetTop <
      targetHeight * -1 - (this.getContainerSelectorFocusOffsetTop() - this.getContainerOffsetTop())
    );
  };

  private handleLong = () => {
    const { scrollY } = window;
    if (this.prevScrollY > scrollY) {
      this.handleLongScrollUp(scrollY);
    } else {
      this.handleLongScrollDown(scrollY);
    }
    this.prevScrollY = scrollY;
  };

  private getInnerTop = () => {
    const innerMeasure = this.$inner.getBoundingClientRect();
    const innerTop = innerMeasure.top || -1;
    return innerTop;
  };

  private getInnerOffsetTop = () => {
    return offset(this.$inner).top;
  };

  private getContainerOffsetTop = () => {
    return offset(this.$container).top;
  };

  private getContainerSelectorFocusOffsetTop = () => {
    const $containerSelectorFocus = this.getContainerSelectorFocus();
    return $containerSelectorFocus ? offset($containerSelectorFocus).top : 0;
  };

  private getContainerSelectorFocusOffsetBottom = () => {
    const $containerSelectorFocus = this.getContainerSelectorFocus();
    return $containerSelectorFocus
      ? Math.trunc(offset($containerSelectorFocus).top + $containerSelectorFocus.clientHeight)
      : 0;
  };

  private getInnerPositionTop = () => {
    if (this.$container && this.$inner) {
      return this.getInnerOffsetTop() - this.getContainerOffsetTop();
    }
    return 0;
  };

  private handleLongScrollUp = async (scrollY: number) => {
    const { offsetTop } = this.props;
    const { containerMeasure, innerPosition } = this.state;
    const isTop = (containerMeasure as any).top > offsetTop;
    const innerTop = this.getInnerTop();
    if (isTop) {
      this.setState({
        innerPosition: 'static',
      });
    } else {
      if (
        (containerMeasure as any).top <= innerTop &&
        (innerPosition === 'fixedBottom' ||
          (innerPosition === 'absoluteBottom' &&
            scrollY + window.innerHeight <= this.getContainerSelectorFocusOffsetBottom()))
      ) {
        await this.setState({
          innerPosition: 'absoluteCenter',
        });
      }
      this.setInnerPositionFixedTop();
    }
  };

  private setInnerPositionFixedTop = () => {
    const { offsetTop } = this.props;
    const { innerPosition } = this.state;
    const innerTop = this.getInnerTop();
    this.setState({
      innerTop: this.getInnerPositionTop(),
    });
    if (innerTop >= offsetTop && innerPosition === 'absoluteCenter') {
      this.setState({
        innerPosition: 'fixedTop',
      });
    }
  };

  private handleLongScrollDown = (scrollY: number) => {
    const { containerMeasure, innerPosition } = this.state;
    const isBottom =
      Math.trunc(scrollY + window.innerHeight) >=
      Math.trunc(this.getInnerOffsetTop() + (containerMeasure as any).height);
    const isWrapBottom = this.checkWrapBottom();
    if (innerPosition === 'fixedTop') {
      this.setState({
        innerPosition: 'absoluteCenter',
      });
    }
    if (isWrapBottom) {
      this.setState({
        innerPosition: 'absoluteBottom',
      });
    } else if (isBottom) {
      this.setState({
        innerPosition: 'fixedBottom',
        innerTop: this.getInnerPositionTop(),
      });
    }
  };

  private getShortPosition = (containerMeasure: StickyState['containerMeasure']) => {
    const { offsetTop } = this.props;
    if ((containerMeasure as any).top <= offsetTop) {
      if (this.checkWrapBottom()) {
        return 'absoluteBottom';
      }
      return 'fixedTop';
    }
    return 'static';
  };

  private handleShort = () => {
    const { containerMeasure } = this.state;
    this.setState({
      innerPosition: this.getShortPosition(containerMeasure),
    });
  };

  private getInnerStyle = (): CSSProperties => {
    const { offsetTop, zIndex } = this.props;
    const { targetHeight, innerPosition, containerMeasure, isLong, innerTop } = this.state;
    const topForAbsoluteBottom =
      targetHeight -
      (containerMeasure as any).height +
      (this.getContainerSelectorFocusOffsetTop() - this.getContainerOffsetTop());
    if (isLong) {
      switch (innerPosition) {
        case 'static':
          return {};
        case 'fixedTop':
          return {
            position: 'fixed',
            top: offsetTop,
            width: containerMeasure.width,
            zIndex,
          };
        case 'absoluteCenter':
          return {
            position: 'absolute',
            top: innerTop,
            width: containerMeasure.width,
            zIndex,
          };
        case 'absoluteBottom':
          return {
            position: 'absolute',
            top: topForAbsoluteBottom,
            width: containerMeasure.width,
            zIndex,
          };
        case 'fixedBottom':
          return {
            position: 'fixed',
            bottom: 0,
            width: containerMeasure.width,
            zIndex,
          };
        default:
          return {};
      }
    }
    switch (innerPosition) {
      case 'static':
        return {};
      case 'absoluteBottom':
        return {
          position: 'absolute',
          top: topForAbsoluteBottom,
          width: containerMeasure.width,
          zIndex,
        };
      case 'fixedTop':
        return {
          position: 'fixed',
          top: offsetTop,
          width: containerMeasure.width,
          zIndex,
        };
      default:
        return {};
    }
  };

  private getContainerStyle = (): CSSProperties => {
    const { innerPosition, containerMeasure } = this.state;
    if (innerPosition === 'static') {
      return {
        minHeight: containerMeasure.height,
      };
    }
    return {
      position: 'relative',
      minHeight: containerMeasure.height,
    };
  };

  private checkSticky = () => {
    const { innerPosition } = this.state;
    return innerPosition.search(/fixedTop|fixedBottom/g) !== -1;
  };

  private setContainerRef = (c: any) => {
    this.$container = c;
  };

  private setInnerRef = (c: any) => {
    this.$inner = c;
  };

  private renderHackGetHeightWhenInnerContentMargin = () => {
    return <div style={{ fontSize: 0, visibility: 'hidden' }}>.</div>;
  };

  private renderChildren = () => {
    const { children } = this.props;
    const isSticky = this.checkSticky();
    return typeof children === 'function' ? children(isSticky) : children;
  };

  public render() {
    const { isEnableSticky } = this.state;
    const containerStyle = isEnableSticky ? this.getContainerStyle() : {};
    const innerStyle = isEnableSticky ? this.getInnerStyle() : {};
    return (
      <div ref={this.setContainerRef} style={containerStyle}>
        <div ref={this.setInnerRef} style={innerStyle}>
          {this.renderHackGetHeightWhenInnerContentMargin()}
          {this.renderChildren()}
          {this.renderHackGetHeightWhenInnerContentMargin()}
        </div>
      </div>
    );
  }
}
