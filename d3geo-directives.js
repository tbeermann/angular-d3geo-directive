/*  name        : angular-d3geo-directives
 *  version     : 0.0.3
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
            getFeatureBounds : function(d, path, height, width){
                var bounds = path.bounds(d);
                var dx = bounds[1][0] - bounds[0][0];
                var dy = bounds[1][1] - bounds[0][1];
                var x = (bounds[0][0] + bounds[1][0]) / 2;
                var y = (bounds[0][1] + bounds[1][1]) / 2;
                var scale = .9 / Math.max(dx / width, dy / height);
                var translate = [width / 2 - scale * x, height / 2 - scale * y];
                return {scale:scale, translate:translate};
    
            },
            getLayerBounds: function (layer, projection, height, width) {
                var bounds = [];
                layer.each(function (d) {
                    var b = d3.geo.bounds(d);
                    bounds.push(b);
                });
                return this.zoomToLayersBox(layer, this.determineBoundingBox(bounds), projection, height, width);
            },
            zoomToLayersBox: function (layer, box, projection, height, width) {
                var b = [];
                b.push(projection([box[0][0], box[0][1]]));
                b.push(projection([box[1][0], box[1][1]]));
                var factor = .95;

                var dx = b[1][0] - b[0][0];
                var dy = b[1][1] - b[0][1];
                var x = (b[0][0] + b[1][0]) / 2;
                var y = (b[0][1] + b[1][1]) / 2;

                var scale = factor / Math.max(Math.abs((b[1][0] - b[0][0])) / width,
                        Math.abs((b[1][1] - b[0][1])) / height);

                var translate = [width / 2 - scale * x, height / 2 - scale * y];

                return {scale:scale, translate:translate};


            },
            determineBoundingBox: function (data) {
                var minX = data[0][0][0];
                var minY = data[0][0][1];
                var maxX = data[0][1][0];
                var maxY = data[0][1][1];
                var l = data.length;
                for (var i = 1; i < l; i++) {
                    var d = data[i];
                    //var minXX = d[0][0];
                    if (minX > d[0][0]) {minX = d[0][0];}
                    //var minYY = d[0][1];
                    if (minY > d[0][1]) {minY = d[0][1];}
                    //var maxXX = d[1][0];
                    if (maxX < d[1][0]) {maxX = d[1][0];}
                    //var maxYY = d[1][1];
                    if (maxY < d[1][1]) {maxY = d[1][1];}
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
                    case  "azimuthalEqualArea" :
                        projection = d3.geo.azimuthalEqualArea()
                            .clipAngle(180 - 1e-3)
                            .scale(237)
                            .translate([width / 2, height / 2])
                            .precision(.1);
                        break;
                    case "orthographic" :
                        projection = d3.geo.orthographic()
                            .scale(475)
                            .translate([width / 2, height / 2])
                            .clipAngle(90)
                            .precision(.1)
                            .rotate([90, 0]);
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
                    case "conicEquadistance" :
                        projection = d3.geo.conicEquidistant()
                            .center([0, 0])
                            .scale(128)
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

    d3MapModule.directive('d3map', ['d3MapUtilities', function (d3MapUtilities) {
        return {
            restrict: 'EA',
            scope: {
                layers: '=',
                projection: '=',
                width: '=',
                height: '=',
                pan: '=',
                graticule: '=',
                index:'@',
                mousemove: '=',
                mouseenter: '=',
                mouseout: '=',
                onclick: '='
            },
            template: "<div></div>",
            link: function(scope, element, attrs) {
                scope.svg = null;
                scope.d3projection = null;
                scope.path = null;
                scope.zoom = d3.behavior.zoom().on("zoom", zoomed);
                scope.layerCollection = [];
                scope.graticuleLayer;
                // reference definition
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
                        //.style({'stroke-width': style.strokeWidth});
                        .style("stroke-width", 1.5 / d3.event.scale + "px");
                };

                scope.renderLayer = function(layer) {

                    layer.d3Layer = scope.svg.insert("g").selectAll(layer.className).data(layer.geojson.features);

                    layer.symbols = layer.symbols || {color: 'black', opacity: .7, stroke: '#67C8FF', strokeWidth: .4};
                    layer.hoversymbols = layer.hoversymbols || {color: 'black', opacity: 1, stroke: '#67C8FF', strokeWidth: 5};

                    layer.d3Layer
                        .enter()
                        .insert("path")
                        .attr("class", layer.className)
                        .attr("d", scope.path)
                        .style("fill", function (d, i) {
                            return  layer.symbols.color;
                        })
                        .style("opacity", function (d, i) {
                            return layer.symbols.opacity
                        })
                        .style("stroke", function (d, i) {
                            return layer.symbols.stroke;
                        })
                        .style("stroke-width", function (d, i) {
                            return layer.symbols.strokeWidth;
                        })
                        if (layer.selectable) {
                            layer.d3Layer
                                .on("mousemove", function (d) {
                                    if (scope.mousemove) scope.mousemove(d, i);
                                })
                                .on("mouseenter", function (d, i) {
                                    scope.applyStyle(this, layer.hoversymbols);
                                    if (scope.mouseenter) scope.mouseenter(d, i);
                                })
                                .on("mouseout", function (d, i) {
                                    scope.applyStyle(this, layer.symbols);
                                    if (scope.mouseout) scope.mouseout(d, i);
                                })
                                .on("click", function (d, i) {
                                    if (scope.onclick) scope.onclick(d, i);
                                });
                        }

                    if (layer.zoomTo){
                        var b = d3MapUtilities.getLayerBounds(layer.d3Layer, scope.d3projection, scope.height, scope.width);
                        scope.zoomToBounds(b.translate, b.scale);
                    }
                    
                    if (scope.graticule && !scope.graticuleLayer) {
                        scope.showGraticule();
                    }

                };

                scope.showGraticule = function(){

                    var graticule = d3.geo.graticule();
                    scope.graticuleLayer =
                        scope.svg.append("path")
                        .datum(graticule)
                        .attr("class", "graticule")
                        .attr("d", scope.path)
                        .style("fill", "none")
                        .style("stroke", "#777")
                        .style("stroke-width", ".5px")
                        .style("stroke-opacity", ".5");
                };

                scope.zoomToFeature = function(d){
                    // get feature translate and scale
                    var featureBounds = d3MapUtilities.getFeatureBounds(d, scope.path, scope.height, scope.width);
                    // use those data to zoom to area
                    scope.zoomToBounds(featureBounds.translate, featureBounds.scale);
                }

                scope.zoomToBounds = function(translate, scale) {
                    scope.svg.transition()
                        .duration(750)
                        .call(scope.zoom.translate(translate).scale(scale).event);
                };

                function zoomed() {
                    var gg = scope.svg.selectAll("g");
                    gg.style("stroke-width", 1.5 / d3.event.scale + "px");
                    gg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    if(scope.graticuleLayer) {
                        scope.graticuleLayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    }
                }

                scope.stopped = function() {
                    if (d3.event.defaultPrevented) d3.event.stopPropagation();
                };

                scope.$watch('projection', function(newValue, oldValue){
                    //if (scope.d3projection == null) {
                        scope.projection = newValue;
                   // }
                });


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
                        scope.svg =
                            d3.select(element.find("div")[0])
                            .append("svg")
                            .attr("width", scope.width)
                            .attr("height", scope.height)
                            .on("click", scope.stopped, true);

                        scope.svg
                            .append("rect")
                            .attr("class", "background")
                            .attr("width", scope.width)
                            .attr("height", scope.height)
                            .style("fill", "white")
                            .style("pointer-events", "all");

                        scope.svg
                            .call(scope.zoom)
                            .call(scope.zoom.event);

                        scope.d3projection = d3MapUtilities.selectProjection(scope.projection, attrs.width, attrs.height);
                        scope.path = d3.geo.path().projection(scope.d3projection);
                    }

                    layer.name = layer.name || 'newlayer';
                    if (layer.name.trim() === ''){
                        layer.name = 'newlayer';
                    }

                    layer.selectable = layer.selectable || false;
                    layer.className = '.' + layer.name + "-" + d3MapUtilities.guid();
                    layer.style =  {color: 'black', opacity: .7, stroke: '#67C8FF', strokeWidth: .4};
                    layer.hoversymbols = layer.hoversymbols || {color: 'black', opacity: 1, stroke: '#67C8FF', strokeWidth: 5};

                    scope.renderLayer(layer);
                });
            }
        }
    }]);

})(window.angular, window.d3);






















