import React from 'react'
import { cn } from '@/lib/utils'

type BGVariantType =
  | 'dots'
  | 'diagonal-stripes'
  | 'grid'
  | 'horizontal-lines'
  | 'vertical-lines'
  | 'checkerboard'

type BGMaskType =
  | 'fade-center'
  | 'fade-edges'
  | 'fade-top'
  | 'fade-bottom'
  | 'fade-left'
  | 'fade-right'
  | 'fade-x'
  | 'fade-y'
  | 'none'

type BGPatternProps = React.ComponentProps<'div'> & {
  variant?: BGVariantType
  mask?: BGMaskType
  size?: number
  fill?: string
}

function getMaskImage(mask: BGMaskType): string | undefined {
  switch (mask) {
    case 'fade-edges':
      return 'radial-gradient(ellipse at center, black, transparent)'
    case 'fade-center':
      return 'radial-gradient(ellipse at center, transparent, black)'
    case 'fade-top':
      return 'linear-gradient(to bottom, transparent, black)'
    case 'fade-bottom':
      return 'linear-gradient(to bottom, black, transparent)'
    case 'fade-left':
      return 'linear-gradient(to right, transparent, black)'
    case 'fade-right':
      return 'linear-gradient(to right, black, transparent)'
    case 'fade-x':
      return 'linear-gradient(to right, transparent, black, transparent)'
    case 'fade-y':
      return 'linear-gradient(to bottom, transparent, black, transparent)'
    default:
      return undefined
  }
}

function getBgImage(variant: BGVariantType, fill: string, size: number): string | undefined {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`
    default:
      return undefined
  }
}

const BGPattern = ({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = '#252525',
  className,
  style,
  ...props
}: BGPatternProps) => {
  const maskImage = getMaskImage(mask)

  return (
    <div
      className={cn(className)}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        backgroundImage: getBgImage(variant, fill, size),
        backgroundSize: `${size}px ${size}px`,
        ...(maskImage
          ? {
              WebkitMaskImage: maskImage,
              maskImage,
            }
          : {}),
        ...style,
      }}
      {...props}
    />
  )
}

BGPattern.displayName = 'BGPattern'
export { BGPattern }
