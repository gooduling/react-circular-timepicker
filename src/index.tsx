//@ts-nocheck
import * as React from 'react'
import styles from './circularPicker.css'
import * as d3 from 'd3'
import moment from 'moment'

interface TopologyQueryState {}

interface Props {
  outerRadius: number
  innerRadius: number
  showResults: boolean
  onClick: () => void
}

const config = {
  labelsPAdding: 13,
  segmentsColorsArray: ['#bbb', '#ddd'],
  defaultInnerRadiusIndex: 1.4,
  defaultChartPadding: 60
}

class CircularPicker extends React.Component<Props, TopologyQueryState> {
  constructor(props) {
    super(props)
    this.state = {}
  }
  // static propTypes = {
  //   outerRadius : React.PropTypes.number,
  //   innerRadius : React.PropTypes.number,
  //   showResults : React.PropTypes.bool,
  //   onClick   : React.PropTypes.func,
  //   interval : (props, propName, componentName) => {
  //     const interval = props[propName];
  //     if ( !Number.isInteger(interval) || interval > 60 || 60 % interval) {
  //       return new Error(
  //         `Invalid prop ${propName} supplied to ${componentName}. Validation failed.
  //                 Expects integer equal or less than 60 and 60 is divisible by it`
  //       );
  //     }
  //   },
  //   boundaryHour : (props, propName, componentName) => {
  //     const boundaryHour = props[propName];
  //     if ( !Number.isInteger(boundaryHour) || boundaryHour > 24) {
  //       return new Error(
  //         `Invalid prop ${propName} supplied to ${componentName}. Validation failed.
  //                 Expects integer less than 24`
  //       );
  //     }
  //   },
  // };

  static defaultProps = {
    outerRadius: 150,
    interval: 30,
    boundaryHour: 8,
    showResults: false,
    onClick: (value) => {
      console.log(value)
    }
  }

  componentWillMount() {
    let {
      outerRadius,
      innerRadius,
      interval,
      boundaryHour,
      onClick,
      showResults
    } = this.props
    innerRadius =
      innerRadius && innerRadius < outerRadius
        ? innerRadius
        : outerRadius / config.defaultInnerRadiusIndex

    const width = outerRadius * 2 + config.defaultChartPadding
    const segmentsInHour = 60 / interval
    const totalNumberOfSegments = 720 / interval
    const boundaryIsPostMeridiem = boundaryHour > 12

    const pie = d3
      .pie()
      .sort(null)
      .value((d) => 1)
    const segmentsArray = pie(new Array(totalNumberOfSegments))
    const hoursLabelsArray = pie(new Array(12))
    const colorScale = d3
      .scaleOrdinal()
      .domain([0, 1, 2])
      .range(config.segmentsColorsArray)
    const segmentsArcFn = d3
      .arc()
      .outerRadius(outerRadius)
      .innerRadius(innerRadius)
    const minutesArcFn = d3
      .arc()
      .outerRadius(outerRadius + config.labelsPAdding)
      .innerRadius(outerRadius + config.labelsPAdding)
      .startAngle((d) => d.startAngle + Math.PI / totalNumberOfSegments)
      .endAngle((d) => d.endAngle + Math.PI / totalNumberOfSegments)
    const hoursArcFn = d3
      .arc()
      .outerRadius(outerRadius + config.labelsPAdding)
      .innerRadius(outerRadius + config.labelsPAdding)
      .startAngle((d) => d.startAngle - 0.26)
      .endAngle((d) => d.endAngle - 0.26)

    const initialObject = {
      interval,
      boundaryHour,
      width,
      segmentsInHour,
      boundaryIsPostMeridiem,
      segmentsArcFn,
      minutesArcFn,
      hoursArcFn,
      segmentsArray,
      showResults,
      onClick,
      hoursLabelsArray,
      colorScale,
      innerRadius,
      outerRadius,
      totalNumberOfSegments
    }
    this.setState({ initialObject })
  }

  /* On click on segment convert simple segment's value [startValue, endValue] in moment.js object and save it in a state as "chosen" */
  handleClick(clickedValue, isEntered) {
    /* skip handling if click anf hover were started out of segments*/
    if (isEntered && !this.state.initialObject.mouseIsClickedDown) return
    const clickedStartValue = clickedValue[0]
    const clickedFinishValue = clickedValue[1]
    const {
      initialObject: { boundaryHour, onClick },
      ...segments
    } = this.state
    const segmentPreviousValue = segments[clickedFinishValue]
    const segmentCurrentValue = {
      [String(clickedFinishValue)]: segmentPreviousValue
        ? null
        : [
            moment()
              .set('hour', boundaryHour)
              .set('minute', 0)
              .minute(clickedStartValue),
            moment()
              .set('hour', boundaryHour)
              .set('minute', 0)
              .minute(clickedFinishValue)
          ]
    }

    this.setState(segmentCurrentValue)
    onClick({ ...segments, ...segmentCurrentValue })
  }

  /* Define an hours labels. "showSingleBoundaryHour" set displaying of doubled boundary hours (e.g. '8|20', '16|4') */
  getHoursLabels(boundary, index, showSingleBoundaryHour) {
    const hour24 = index + 12,
      hour12 = showSingleBoundaryHour ? index : index || '00',
      isInBottomQuadrants = index > 3 && index < 10

    if (boundary > 12) {
      boundary = boundary - 12
      if (index === boundary)
        return showSingleBoundaryHour
          ? hour24
          : isInBottomQuadrants
          ? `${hour24} | ${hour12}`
          : `${hour12} | ${hour24}`
      return index < boundary ? hour12 : hour24
    } else {
      if (index === boundary)
        return showSingleBoundaryHour
          ? hour12
          : isInBottomQuadrants
          ? `${hour12} | ${hour24}`
          : `${hour24} | ${hour12}`
      return index < boundary ? hour24 : hour12
    }
  }

  /* combine the neighbour short time spans in one union (e.g. '5:20-5:30' and '5:30-5:40' will be combined in a '5:20-5:40') */
  getReducedArray(state) {
    const keysArr = Object.keys(state).filter(
      (key) => key !== 'initialObject' && state[key]
    )
    if (keysArr.length) {
      if (keysArr.length === 1) {
        /* if is single, returns it - no needs to combine */
        return [state[keysArr[0]]]
      } else {
        /* combine time spans */
        let reducedArr = keysArr.reduce((prev, currentKey) => {
          let tempArr = Array.isArray(prev) ? prev : [state[prev]],
            lastElement = tempArr[tempArr.length - 1],
            currentElement = state[currentKey]

          if (!currentElement[0].diff(lastElement[1], 'minutes')) {
            /*if last element finished in the same time current started, combine them as ['start of the last', 'end of the current]*/
            tempArr[tempArr.length - 1] = [lastElement[0], currentElement[1]]
          } else {
            tempArr.push(currentElement)
          }
          return tempArr
        })

        return reducedArr
      }
    }
    /* if there is no chosen spans in the state, returns empty array */
    return []
  }

  getBoundaryLinesRotationDegree() {
    let { boundaryHour, boundaryIsPostMeridiem } = this.state.initialObject
    return 30 * (boundaryIsPostMeridiem ? boundaryHour - 12 : boundaryHour)
    /* 1 hour = 360 / 12 = 30 degrees */
  }
  setSegmentsValue(index) {
    const {
      interval,
      boundaryHour,
      totalNumberOfSegments,
      segmentsInHour,
      boundaryIsPostMeridiem
    } = this.state.initialObject
    index = boundaryIsPostMeridiem ? index + totalNumberOfSegments : index
    const boundaryIndex = boundaryHour * segmentsInHour
    const recalculatedIndex =
      index -
      boundaryIndex +
      (index < boundaryIndex ? totalNumberOfSegments : 0)
    const startMinutes = recalculatedIndex * interval
    return [startMinutes, startMinutes + interval]
  }

  storeMouseIsClickedDown(mouseIsClickedDown) {
    const { initialObject } = this.state
    this.setState({ initialObject: { ...initialObject, mouseIsClickedDown } })
  }

  render() {
    if (!this.state.initialObject) return null
    const {
      interval,
      boundaryHour,
      width,
      segmentsInHour,
      segmentsArcFn,
      minutesArcFn,
      hoursArcFn,
      segmentsArray,
      hoursLabelsArray,
      colorScale,
      outerRadius,
      innerRadius,
      showResults
    } = this.state.initialObject

    return (
      <div
        className={`circularWrapper ${styles.wrapper}`}
        onMouseDown={() => {
          this.storeMouseIsClickedDown(true)
        }}
        onMouseUp={() => {
          this.storeMouseIsClickedDown(false)
        }}
        onMouseLeave={() => {
          this.storeMouseIsClickedDown(false)
        }}
      >
        <svg className={styles.svgStyles} width={width} height={width}>
          <g transform={`translate(${width / 2},${width / 2})`}>
            {segmentsArray.map((item, index) => (
              <Segment
                key={index}
                index={index}
                item={item}
                segmentArcFn={segmentsArcFn}
                minutesArcFn={minutesArcFn}
                label={((index % segmentsInHour) + 1) * interval}
                fill={colorScale(Math.floor(index / segmentsInHour) % 2)}
                value={this.setSegmentsValue(index)}
                handleClick={this.handleClick.bind(this)}
                isActive={this.state[this.setSegmentsValue(index)[1]]}
              />
            ))}
            <g className='hoursLabelsGroup'>
              {hoursLabelsArray.map((item, index) => (
                <text
                  key={index}
                  className={`hourLabel ${styles.hourLabel}${
                    index === boundaryHour ? ' boundary' : ''
                  }`}
                  transform={`translate(${hoursArcFn.centroid(item)})`}
                  dy='.35em'
                  style={{ textAnchor: 'middle' }}
                >
                  {this.getHoursLabels(boundaryHour, index, true)}
                </text>
              ))}
            </g>
            <g className='boundaryGroup'>
              <path
                className={`boundaryLine ${styles.boundaryLine}`}
                d={`M 0 -${innerRadius - 20} V -${outerRadius + 4}`}
                transform={`rotate(${this.getBoundaryLinesRotationDegree()})`}
              />
            </g>
          </g>
        </svg>
        {showResults ? (
          <TimeResults results={this.getReducedArray(this.state)} />
        ) : null}
      </div>
    )
  }
}

export default CircularPicker

function TimeResults(props) {
  const { results } = props
  return results.length ? (
    <div className={styles.results}>
      <h6>Selected Time</h6>
      {results.map((segment, n) =>
        segment.length ? (
          <p key={n}>
            {segment[0].format('H:mm')} - {segment[1].format('H:mm')}
          </p>
        ) : null
      )}
    </div>
  ) : null
}

function Segment(props) {
  const {
    item,
    segmentArcFn,
    minutesArcFn,
    label,
    fill,
    value,
    handleClick,
    isActive
  } = props
  return (
    <g
      className={`segment ${styles.segment} ${isActive ? styles.active : ''}`}
      onClick={() => {
        handleClick(value)
      }}
      onMouseDown={() => {
        handleClick(value, true)
      }}
    >
      <path
        d={segmentArcFn(item)}
        fill={fill}
        onMouseLeave={() => {
          handleClick(value, true)
        }}
        onDragLeave={() => {
          handleClick(value, true)
        }}
        onMouseDown={() => {
          handleClick(value, true)
        }}
      />
      {label === 60 ? null : (
        <text
          className={`minuteLabel ${styles.minuteLabel}`}
          transform={`translate(${minutesArcFn.centroid(item)})`}
          dy='.35em'
        >
          {label}
        </text>
      )}
    </g>
  )
}
