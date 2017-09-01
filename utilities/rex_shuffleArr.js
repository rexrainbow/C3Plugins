(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    window.rexObjs.ShuffleArr = function (arr, randomGen) {
        if (randomGen == null)
            randomGen = Math;

        var i = arr.length, j, temp;
        if (i == 0) return;
        while (--i) {
            j = Math.floor(randomGen.random() * (i + 1));
            temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    };

}());     