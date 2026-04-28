// Manual mock for vega-embed
const vegaEmbed = jest.fn(() =>
  Promise.resolve({
    view: {
      finalize: jest.fn(),
      addEventListener: jest.fn(),
    },
  })
)

module.exports = vegaEmbed
module.exports.default = vegaEmbed
