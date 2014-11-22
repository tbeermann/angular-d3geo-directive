/*  name        : d3GeoDirective
 *  version     : 0.0.3
 *  license     : MIT
 *  description : Angular directive for creating D3 vector maps with geojson.
 *                Most of this code can be found in D3 examples.  It has been
 *                bundled together here in an angular directive
 */

;(function(angular, d3){
    'use strict';

    var d3MapModule = new angular.module('d3MapModule', []);

    d3MapModule = new angular.directive('d3GeoMap', [function(){
        return {
            restrict: 'EA',
            scope: {
                layers: '=',
                projection: '=',
                width: '=',
                height: '=',
                pan: '=',
                index: '@',
                mousemove: '=',
                mouseenter: '=',
                mouseout: '=',
                onclick: '='
            },
            template: "<div></div>",
            link: function (scope, element, attrs) {
                scope.svg;
                scope.projection = d3.geo.albersUsa()
                    .scale(1000)
                    .translate([width / 2, height / 2]);

                var active = d3.select(null);

                scope.render = function(){
                    var width = 960,
                        height = 500,
                        active = d3.select(null);


                    var zoom = d3.behavior.zoom()
                        .translate([0, 0])
                        .scale(1)
                        .scaleExtent([1, 8])
                        .on("zoom", zoomed);

                    var path = d3.geo.path()
                        .projection(projection);

                    var svg = d3.select("body").append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .on("click", stopped, true);

                    svg.append("rect")
                        .attr("class", "background")
                        .attr("width", width)
                        .attr("height", height)
                        .on("click", reset);

                    var g = svg.append("g");

                    svg
                        .call(zoom) // delete this line to disable free zooming
                        .call(zoom.event);

                    d3.json("/d/4090846/us.json", function(error, us) {
                        g.selectAll("path")
                            .data(topojson.feature(us, us.objects.states).features)
                            .enter().append("path")
                            .attr("d", path)
                            .attr("class", "feature")
                            .on("click", clicked);

                        g.append("path")
                            .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
                            .attr("class", "mesh")
                            .attr("d", path);
                    });
                }

                function clicked(d) {
                    if (active.node() === this) return reset();
                    active.classed("active", false);
                    active = d3.select(this).classed("active", true);

                    var bounds = path.bounds(d),
                        dx = bounds[1][0] - bounds[0][0],
                        dy = bounds[1][1] - bounds[0][1],
                        x = (bounds[0][0] + bounds[1][0]) / 2,
                        y = (bounds[0][1] + bounds[1][1]) / 2,
                        scale = .9 / Math.max(dx / width, dy / height),
                        translate = [width / 2 - scale * x, height / 2 - scale * y];

                    svg.transition()
                        .duration(750)
                        .call(zoom.translate(translate).scale(scale).event);
                }

                function reset() {
                    active.classed("active", false);
                    active = d3.select(null);

                    svg.transition()
                        .duration(750)
                        .call(zoom.translate([0, 0]).scale(1).event);
                }

                function zoomed() {
                    g.style("stroke-width", 1.5 / d3.event.scale + "px");
                    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }

                // If the drag behavior prevents the default click,
                // also stop propagation so we don’t click-to-zoom.
                function stopped() {
                    if (d3.event.defaultPrevented) d3.event.stopPropagation();
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

                    //if (d3MapUtilities.verifyIsGeoJson(layer.geojson) == false) {return;}

                    if (scope.svg === null) {
                        scope.svg = d3.select(element.find("div")[0])
                            .append("svg")
                            .attr("width", scope.width)
                            .attr("height", scope.height)
                            .call(scope.zoom.on("zoom", scope.redraw))
                            .append("g");
                    }

                    scope.renderLayer(layer);
                });


            }
        }

    }]);


})(window.angular, window.d3);
