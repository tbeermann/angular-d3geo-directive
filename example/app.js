var mapApp = angular.module('d3GeoDirectives', ['d3MapModule']);

mapApp.service('dataService', function( $http, $q ){
    function getData() {
        var request = $http({
            method: "get",
            url: "../data/world.geojson",
            params: {
                action: "get"
            }
        });
        return( request.then( handleSuccess, handleError ) );
    }

    function handleError(response) {
        if (! angular.isObject( response.data ) || ! response.data.message) {
            return( $q.reject( "No data for you!" ));
        }
        return($q.reject(response.data.message));
    }

    function handleSuccess( response ) {
        return( response.data );
    }

    return {get:getData} ;
});

mapApp.controller('MainCtrl', function($scope, dataService) {
    $scope.data = [];
    $scope.projection = 'equirectangular';
    $scope.showGraticule = true;
    $scope.symbols = {color:'purple', opacity:0.7, stroke:'#67C8FF', strokeWidth:0.4};

    loadRemoteData();

    function loadRemoteData() {
        dataService.get().then(
            function( data ) {
                applyRemoteData( data );
            });
    }

    function applyRemoteData(data){
        var layer = {
            geojson : data,
            symbols : $scope.symbols,
            zoomTo : true,
            selectable : true,
            name : 'world'
        };

        $scope.data.push(layer);
    }
});

