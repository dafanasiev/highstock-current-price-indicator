/**
 * Highstock plugin for displaying current price indicator.
 *
 * Author: Roland Banguiran
 * Email: banguiran@gmail.com
 *
 */

// JSLint options:
/*global Highcharts, document */

(function(H) {
    'use strict';
    var merge = H.merge;

    H.wrap(H.Chart.prototype, 'init', function(proceed) {

        // Run the original proceed method
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        renderCurrentPriceIndicator(this);
    });

    H.wrap(H.Chart.prototype, 'redraw', function(proceed) {

        // Run the original proceed method
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        renderCurrentPriceIndicator(this);
    });

    function getCurrentPrice(chart) {

        var chartSeries = chart.series;
        var priceSeries = chartSeries[0];
        var priceData = priceSeries.yData;

        var currentPrice = 0.0;
        if (priceData.length > 0) {
            switch (priceSeries.type) {
                case 'line':
                case 'spline':
				case 'area':
                    currentPrice = priceData[priceData.length - 1];
                    break;
                default:
                    //FIXME: add more types processing - default for OHLC
                    currentPrice = priceData[priceData.length - 1][3];
                    break;
            }
        }

        return currentPrice;
    }

    function renderCurrentPriceIndicator(chart) {

        var priceYAxis = chart.yAxis[0],
            currentPrice = getCurrentPrice(chart),

            extremes = priceYAxis.getExtremes(),
            min = extremes.min,
            max = extremes.max,

            options = chart.options.yAxis[0].currentPriceIndicator,
            defaultOptions = {
                backgroundColor: '#000000',
                borderColor: '#000000',
                lineColor: '#000000',
                lineDashStyle: 'Solid',
                lineOpacity: 0.8,
                enabled: true,
                style: {
                    color: '#ffffff',
                    fontSize: '11px',
					fontFamily: ''
                },
                x: 0,
                y: 0,
                zIndex: 7,
                labelFormatter: null
            },

            chartWidth = chart.chartWidth,
            chartHeight = chart.chartHeight,
            marginRight = chart.optionsMarginRight || 0,
            marginLeft = chart.optionsMarginLeft || 0,

            renderer = chart.renderer,

            currentPriceIndicator = priceYAxis.currentPriceIndicator || {},
            isRendered = Object.keys(currentPriceIndicator).length,

            group = currentPriceIndicator.group,
            label = currentPriceIndicator.label,
            box = currentPriceIndicator.box,
            line = currentPriceIndicator.line,

            y,

            lineFrom;

        options = merge(true, defaultOptions, options);

        var currentPriceTxt = options.labelFormatter ? options.labelFormatter(currentPrice) : ('' + currentPrice);

        y = priceYAxis.toPixels(currentPrice);
        y += options.y;

        lineFrom = priceYAxis.opposite ? marginLeft : chartWidth - marginRight;

        /*
        width = priceYAxis.opposite ? (marginRight ? marginRight : 40) : (marginLeft ? marginLeft : 40);
        debugger;
        x = priceYAxis.opposite ? chartWidth - width : marginLeft;
        // offset
        x += options.x;
        
        */

        if (options.enabled) {

            // render or animate
            if (!isRendered) {
                // group
                group = renderer.g()
                    .attr({
                        zIndex: options.zIndex
                    })
                    .add();

                // label
                label = renderer.text(currentPriceTxt, 0, y)
                    .css({
                        color: options.style.color,
                        fontSize: options.style.fontSize,
						fontFamily: options.style.fontFamily
                    }).add(group);

                var labelBBox = label.getBBox();
                var width = labelBBox.width;
                var height = labelBBox.height;
                var x = priceYAxis.opposite ? chartWidth - priceYAxis.right : marginLeft;
                x += options.x;

                //fix label pos
                label.attr({
                    x: x,
                    zIndex: 2
                });

                // box
                box = renderer.path([  'M', x-6, y, 
									   'L', x, y- (height / 2) - 2, 
									   'L', x+width+4, y- (height / 2) - 2, 
									   'L', x+width+4, y+ (height / 2), 
									   'L', x, y+ (height / 2), 
									   'Z'
									   ])
                    .attr({
                        stroke: options.borderColor,
						'stroke-width': 1,
                        opacity: options.lineOpacity,
                        fill: options.backgroundColor,
                        zIndex: 1
                    })
                    .add(group);

                // box
                line = renderer.path(['M', lineFrom, y, 'L', x-6, y])
                    .attr({
                        stroke: options.lineColor,
                        'stroke-dasharray': dashStyleToArray(options.lineDashStyle, 1),
                        'stroke-width': 1,
                        opacity: options.lineOpacity,
                        zIndex: 1,
                    })
                    .add(group);

                // adjust
                label.animate({
                    y: y + (height / 4)
                }, 0);
            } else {
                currentPriceIndicator.label.attr({
                    text: currentPriceTxt
                });

                var labelBBox = currentPriceIndicator.label.getBBox();
                var width = labelBBox.width;
                var height = labelBBox.height;
                var x = priceYAxis.opposite ? chartWidth - priceYAxis.right : marginLeft;
                x += options.x;

                currentPriceIndicator.label.animate({
                    text: currentPriceTxt,
                    y: y,
                    x: x
                }, 0);

                currentPriceIndicator.box.animate({
                    d: [  	'M', x-6, y, 
							'L', x, y- (height / 2) - 2, 
							'L', x+width+4, y- (height / 2) - 2, 
							'L', x+width+4, y+ (height / 2), 
							'L', x, y+ (height / 2), 
							'Z'
						]
                }, 0);

                currentPriceIndicator.line.animate({
                    d: ['M', lineFrom, y, 'L', x-6, y]
                }, 0);

                // adjust
                currentPriceIndicator.label.animate({
                    y: y + (height / 4)
                }, 0);
            }

            if (currentPrice > min && currentPrice < max) {
                group.show();
            } else {
                group.hide();
            }

            // register to price y-axis object
            priceYAxis.currentPriceIndicator = {
                group: group,
                label: label,
                box: box,
                line: line
            }
        }
    };

    /**
     * Convert dash style name to array to be used a the value
     * for SVG element's "stroke-dasharray" attribute
     * @param {String} dashStyle    Possible values: 'Solid', 'Shortdot', 'Shortdash', etc
     * @param {Integer} width   SVG element's "stroke-width"
     * @param {Array} value
     */
    function dashStyleToArray(dashStyle, width) {
        var value;

        dashStyle = dashStyle.toLowerCase();
        width = (typeof width !== 'undefined' && width !== 0) ? width : 1;

        if (dashStyle === 'solid') {
            value = 'none';
        } else if (dashStyle) {
            value = dashStyle
                .replace('shortdashdotdot', '3,1,1,1,1,1,')
                .replace('shortdashdot', '3,1,1,1')
                .replace('shortdot', '1,1,')
                .replace('shortdash', '3,1,')
                .replace('longdash', '8,3,')
                .replace(/dot/g, '1,3,')
                .replace('dash', '4,3,')
                .replace(/,$/, '')
                .split(','); // ending comma

            var i = value.length;
            while (i--) {
                value[i] = parseInt(value[i]) * width;
            }
            value = value.join(',');
        }

        return value;
    };
}(Highcharts));
