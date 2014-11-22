/*  name        : angular-d3geo-directives
 *  version     : 0.0.2
 *  license     : MIT
 *  description : Angular directive for creating D3 vector maps with geojson.
 *                Most of this code can be found in D3 examples.  It has been
 *                bundled together here in an angular directive
 */

 ;(function(angular, d3){
    'use strict';

    var d3MapModule = new angular.module('d3MapModule', []);

    d3MapModule.factory("d3MapUtilities", [function () {
        return {
            zoomToLayer: function (svg,layer, path, projection, height, width, zoom) {
                var bounds = [];
                layer.each(function (d) {
                    var b = d3.geo.bounds(d);
                    bounds.push(b);
                });
                return this.zoomToLayersBox(svg,layer, this.determineBoundingBox(bounds), projection, height, width, zoom);
            },
            zoomToLayersBox: function (svg,layer, box, projection, height, width, zoom) {
                var b = [];
                b.push(projection([box[0][0], box[0][1]]));
                b.push(projection([box[1][0], box[1][1]]));
                var factor = .95;
                var scale = factor / Math.max(Math.abs((b[1][0] - b[0][0])) / width,
                        Math.abs((b[1][1] - b[0][1])) / height);
                var translate = [-(b[1][0] + b[0][0]) / 2 , -(b[1][1] + b[0][1]) / 2];

                var translateStr = translate[0] + "," + translate[1];

                var transform = "translate(" + projection.translate() + ")"
                    + "scale(" + scale.toString() + ")"
                    + "translate(" + translateStr + ")";

              //  svg.transition().duration(750).attr("transform",transform);

                svg.transition()
                    .duration(750)
                    .call(zoom.translate(translate).scale(scale).event);

                console.log('zoomToLayersBox  scale : ' + scale.toString() + ' translate : ' + translateStr);

                return {wasZoomed:true, scale:scale, translate:translate, transform:transform, projection:projection};
            },
            determineBoundingBox: function (data) {
                var minX = data[0][0][0];
                var minY = data[0][0][1];
                var maxX = data[0][1][0];
                var maxY = data[0][1][1];
                var l = data.length;
                for (var i = 1; i < l; i++) {
                    var d = data[i];
                    var minXX = d[0][0];
                    if (minX > minXX) { minX = minXX; }
                    var minYY = d[0][1];
                    if (minY > minYY) { minY = minYY; }
                    var maxXX = d[1][0];
                    if (maxX < maxXX) { maxX = maxXX; }
                    var maxYY = d[1][1];
                    if (maxY < maxYY) { maxY = maxYY; }
                }
                return [
                    [minX, minY],
                    [maxX, maxY]
                ];
            },
            verifyIsGeoJson: function (data) {
                // A quick and not very sophisticated check to see if the data
                // is 'probably' geojson
                if (data === undefined) {
                    return false;
                }
                if (data.hasOwnProperty("type")) {
                    if (data.type === "FeatureCollection") {
                        return true;
                    }
                }
                return false;
            },
            selectProjection: function (proj, width, height) {
                var projection;
                switch (proj) {
                    case  "azimuthal" :
                        projection = d3.geo.azimuthal()
                            .scale(380)
                            .origin([-71.03, 42.37])
                            .mode("orthographic")
                            .translate([640, 400]);
                        break;
                    case "conicConformal" :
                        projection = d3.geo.conicConformal()
                            .rotate([0, 0])
                            .center([0, 38])
                            .parallels([29.5, 45.5])
                            .scale(1000)
                            .translate([width / 2, height / 2])
                            .precision(.1);
                        break;
                    case "conicEqualArea":
                        projection = d3.geo.conicEqualArea()
                            .rotate([0, 0])
                            .center([0, 38])
                            .parallels([29.5, 45.5])
                            .scale(1000)
                            .translate([width / 2, height / 2])
                            .precision(.1);
                        break;
                    case "equirectangular":
                        projection = d3.geo.equirectangular();
                        break;
                    case "albersUSA" :
                        projection = d3.geo.albersUsa()
                            .translate([width / 2, height / 2]);
                        break;
                    case "albers" :
                        projection = d3.geo.albers();
                        break;
                    case "mercator" :
                        projection = d3.geo.mercator()
                            .translate([width / 2, height / 2])
                            .scale(970);
                        break;
                    default :
                        projection = d3.geo.mercator()
                            .translate([width / 2, height / 2])
                            .scale(970);
                }
                return projection;
            },
            guid :function() {
                //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                        s4() + '-' + s4() + s4() + s4();
            }
        };
    }]);

    d3MapModule.directive('d3multimap', ['d3MapUtilities', function (d3MapUtilities) {
        return {
            restrict: 'EA',
            scope: {
                layers: '=',
                projection: '=',
                width: '=',
                height: '=',
                pan: '=',
                index:'@',
                mousemove: '=',
                mouseenter: '=',
                mouseout: '=',
                onclick: '='
            },
            template: "<div></div>",
            link: function(scope, element, attrs) {
                scope.svg = null;
                scope.projection = null;
                scope.path = null;
                scope.zoom = d3.behavior.zoom()
                    .translate([0, 0])
                    .scale(1)
                    .scaleExtent([1, 8])
                    .on("zoom", zoomed);

                scope.layerCollection = [];
                scope.g = null;

                scope.geoLayer = {
                    geojson:{},
                    symbol:{},
                    hoverSymbol:{},
                    zoomTo: false
                };

                scope.applyStyle = function(el, style){
                    d3.select(el.parentNode.appendChild(el))
                        .style({'stroke':style.stroke})
                        .style({'fill': style.color})
                        .style({'opacity': style.opacity})
                        .style({'stroke-width': style.strokeWidth});
                };

                scope.renderLayer = function(layer) {



                    scope.g.selectAll("path")
                        .data(layer.geojson.features)
                        .enter().append("path")
                        .attr("d", scope.path)
                        .attr("class", layer.className)

                        .style("fill", function (d, i) {
                            return  layer.style.color;
                        })
                        .style("opacity", function (d, i) {
                            return layer.style.opacity
                        })
                        .style("stroke", function (d, i) {
                            return layer.style.stroke;
                        })
                        .style("stroke-width", function (d, i) {
                            return layer.style.strokeWidth;
                        });

                    scope.g
                        .on("mousemove", function (d) {
                            if (scope.mousemove) scope.mousemove(d, i);
                        })
                        .on("mouseenter", function (d, i) {
                            scope.applyStyle(this, selectionStyle);
                            if (scope.mouseenter) scope.mouseenter(d, i);
                        })
                        .on("mouseout", function (d, i) {
                            scope.applyStyle(this, style);
                            if (scope.mouseout) scope.mouseout(d, i);
                        })
                        .on("click", function (d, i) {
                            if (scope.onclick) scope.onclick(d, i);
                        });

//                    if (layer.zoomTo) {
//                        d3MapUtilities.zoomToLayer(scope.svg, layer.d3Layer, layer.path, scope.projection, scope.height, scope.width, scope.zoom);
//                    }

                    testZoom( scope.g.selectAll("path"));


                };

                function testZoom(g) {

                    var bounds = [];
                    g.each(function (d) {
                        var b = d3.geo.bounds(d);
                        bounds.push(b);
                    });


                    //var bounds = path.bounds(d);
                    var    dx = bounds[1][0] - bounds[0][0];
                    var    dy = bounds[1][1] - bounds[0][1];
                    var    x = (bounds[0][0] + bounds[1][0]) / 2;
                    var    y = (bounds[0][1] + bounds[1][1]) / 2;
                    var    scale = .9 / Math.max(dx / scope.width, dy / scope.height);
                    var    translate = [scope.width / 2 - scale * x, scope.height / 2 - scale * y];

                    scope.svg.transition()
                        .duration(750)
                        .call(scope.zoom.translate(translate).scale(scale).event);
                }

                function zoomed() {
                    if (scope.g) {
//                    scope.g.style("stroke-width", 1.5 / d3.event.scale + "px");
                        scope.g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    }
                    console.log("zoomed");

                }

                scope.$watchCollection('layers', function (newValue, oldValue) {

                    var layer;

                    if (newValue.length > 0){
                        for (var i = 0 ; i < newValue.length; i++){
                            if (! newValue[i].id){
                                layer =  newValue[i];
                                layer.id = d3MapUtilities.guid();
                                scope.layerCollection.push(layer);
                            }
                        }
                    }
                    else{
                        return;
                    }

                    if (d3MapUtilities.verifyIsGeoJson(layer.geojson) == false) {return;}

                    if (scope.svg === null) {
                        scope.svg = d3.select(element.find("div")[0])
                            .append("svg")
                            .attr("width", scope.width)
                            .attr("height", scope.height)
                            .call(scope.zoom)
                            .call(scope.zoom.event);


                        scope.projection = d3MapUtilities.selectProjection(attrs.projection, attrs.width, attrs.height);

                        scope.path = d3.geo.path().projection(scope.projection);

                        scope.g = scope.svg.append("g");
                    }

                    layer.className = '.' + layer.name + "-" + d3MapUtilities.guid();
                    layer.style =  {color: 'black', opacity: .7, stroke: '#67C8FF', strokeWidth: .4};
                    layer.hoversymbols = layer.hoversymbols || {color: 'black', opacity: 1, stroke: '#67C8FF', strokeWidth: 5};

                    scope.renderLayer(layer);
                });
            }
        }
    }]);

})(window.angular, window.d3);






















