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

            zoomToLayer: function (layer, path, projection, height, width) {
                var bounds = [];
                layer.each(function (d) {
                    var b = d3.geo.bounds(d);
                    bounds.push(b);
                });
                this.zoomToLayersBox(layer, this.determineBoundingBox(bounds), projection, height, width);
            },
            zoomToLayersBox: function (layer, box, projection, height, width) {
                var b = [];
                b.push(projection([box[0][0], box[0][1]]));
                b.push(projection([box[1][0], box[1][1]]));
                var factor = .95;
                var scale = factor / Math.max(Math.abs((b[1][0] - b[0][0])) / width,
                        Math.abs((b[1][1] - b[0][1])) / height);
                var translate = -(b[1][0] + b[0][0]) / 2 + "," + -(b[1][1] + b[0][1]) / 2;
                layer.transition().duration(750).attr("transform",
                    "translate(" + projection.translate() + ")"
                        + "scale(" + scale.toString() + ")"
                        + "translate(" + translate.toString() + ")");
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
                    if (minX > minXX) {
                        minX = minXX;
                    }
                    var minYY = d[0][1];
                    if (minY > minYY) {
                        minY = minYY;
                    }
                    var maxXX = d[1][0];
                    if (maxX < maxXX) {
                        maxX = maxXX;
                    }
                    var maxYY = d[1][1];
                    if (maxY < maxYY) {
                        maxY = maxYY;
                    }
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
            selectProjection: function (layer, proj, width, height) {
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

    d3MapModule.directive('d3map', ['d3MapUtilities', function (d3MapUtilities) {
        return {
            restrict: 'EA',
            scope: {
                geojson: '=',
                symbols: '=',
                hoversymbols: '=',
                projection: '=',
                width: '=',
                height: '=',
                pan: '=',
                zoomto: '='
            },
            template: "<div></div>",
            link: function(scope, element, attrs) {

                var svg;
                var layer;
                var path;
                var projection;

                var redraw = function() {
                    if (scope.pan){
                        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    }
                };

                var applyStyle = function(el, style){
                    d3.select(el.parentNode.appendChild(el))
                        .style({'stroke':style.stroke})
                        .style({'fill': style.color})
                        .style({'opacity': style.opacity})
                        .style({'stroke-width': style.strokeWidth});
                };

                scope.$watch('geojson', function () {

                    if (d3MapUtilities.verifyIsGeoJson(scope.geojson) == false) {return;}

                    svg = d3.select(element.find("div")[0])
                        .append("svg")
                        .attr("width", scope.width)
                        .attr("height", scope.height)
                        .call(d3.behavior.zoom().on("zoom", redraw))
                        .append("g");

                    layer = svg.selectAll(".country").data(scope.geojson.features);

                    projection = d3MapUtilities.selectProjection(layer, attrs.projection, attrs.width, attrs.height);

                    path = d3.geo.path().projection(projection);

                    var style = attrs.symbols || {color:'black', opacity:.7, stroke:'#67C8FF', strokeWidth:.4};
                    var selectionStyle = attrs.hoversymbols || {color:'black', opacity:1, stroke:'#67C8FF', strokeWidth:5};

                    layer
                        .enter()
                        .insert("path")
                        .attr("class", "country")
                        //.attr("title", function(d,i) {return d.properties[$scope.selectedPackage.nameField]; })
                        .attr("d", path)
                        .style("fill", function(d, i) {return  style.color;})
                        .style("opacity", function(d, i){return style.opacity})
                        .style("stroke", function(d, i){return style.stroke;})
                        .style("stroke-width", function(d, i){return style.strokeWidth;});

                    layer
                        .on("mousemove", function(d){
                        })
                        .on("mouseenter", function(d,i) {
                            applyStyle(this,selectionStyle);
                        })
                        .on("mouseout",  function(d,i) {
                            applyStyle(this,style);
                        })
                        .on("click", function(d,i){
                        });

                    if (scope.zoomto) {
                        d3MapUtilities.zoomToLayer(layer, path, projection, scope.height, scope.width);
                    }

                });
            }
        }
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
                index:'@'

            },
            template: "<div></div>",
            link: function(scope, element, attrs) {

                var svg;
                var path;
                var projection;

                var layerCollection = [];

                var geoLayer = {
                    geojson:{},
                    symbol:{},
                    hoverSymbol:{},
                    zoomTo: false
                };

                var redraw = function() {
                    if (scope.pan){
                        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    }
                };

                var applyStyle = function(el, style){
                    d3.select(el.parentNode.appendChild(el))
                        .style({'stroke':style.stroke})
                        .style({'fill': style.color})
                        .style({'opacity': style.opacity})
                        .style({'stroke-width': style.strokeWidth});
                };

                scope.$watchCollection('layers', function (newValue, oldValue) {

                    if ( newValue !== oldValue ) {
                        //layerCollection.push(newValue);
                    }

                    var layer;

                    if (newValue.length > 0){
                        for (var i = 0 ; i < newValue.length; i++){
                            if (! newValue[i].id){
                                layer =  newValue[i];
                                layer.id = d3MapUtilities.guid();
                            }
                        }
                    }
                    else{
                        return;
                    }

                    if (d3MapUtilities.verifyIsGeoJson(layer.geojson) == false) {return;}

                    if (svg == null) {
                        svg = d3.select(element.find("div")[0])
                            .append("svg")
                            .attr("width", scope.width)
                            .attr("height", scope.height)
                            .call(d3.behavior.zoom().on("zoom", redraw))
                            .append("g");
                    }


                    var d3Layer = svg.selectAll(".country").data(layer.geojson.features);

                    projection = d3MapUtilities.selectProjection(d3Layer, attrs.projection, attrs.width, attrs.height);

                    path = d3.geo.path().projection(projection);

                    var style = attrs.symbols || {color:'black', opacity:.7, stroke:'#67C8FF', strokeWidth:.4};
                    var selectionStyle = attrs.hoversymbols || {color:'black', opacity:1, stroke:'#67C8FF', strokeWidth:5};

                    d3Layer
                        .enter()
                        .insert("path")
                        .attr("class", "country")
                        //.attr("title", function(d,i) {return d.properties[$scope.selectedPackage.nameField]; })
                        .attr("d", path)
                        .style("fill", function(d, i) {return  style.color;})
                        .style("opacity", function(d, i){return style.opacity})
                        .style("stroke", function(d, i){return style.stroke;})
                        .style("stroke-width", function(d, i){return style.strokeWidth;});


                    d3Layer
                        .on("mousemove", function(d){
                        })
                        .on("mouseenter", function(d,i) {
                            applyStyle(this,selectionStyle);
                        })
                        .on("mouseout",  function(d,i) {
                            applyStyle(this,style);
                        })
                        .on("click", function(d,i){
                        });

                    if (layer.zoomTo) {
                        d3MapUtilities.zoomToLayer(d3Layer, path, projection, scope.height, scope.width);
                    }

                });
            }
        }
    }]);

})(window.angular, window.d3);






















