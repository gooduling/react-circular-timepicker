//@ts-nocheck
import React from 'react'

import ExampleComponent from 'react-circular-timepicker'
import 'react-circular-timepicker/dist/index.css'

const App = () => {
  return (
    <div>
      <h2>Hey hey</h2>
      <ExampleComponent showResults />
      <ExampleComponent />
      <ExampleComponent outerRadius={100} interval={20} />
    </div>
  )
}

export default App
