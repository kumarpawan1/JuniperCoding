(function () {

    var frozen = false;
    var timeout = null;

    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    var df2 = new DataFetcher(function() {
            if(!frozen)
                return "/traffic_status";
            else
                return "/traffic_status/frozen"
        });

    function prepareData(data) {
        var graph = {};
        var objArr = {};
        var links = [];
        data.result.data.forEach(function(dataEntry) {
            var tObj = {};

            if(dataEntry.srcObj != undefined) {
                objArr[dataEntry.srcObj] = 1;
                tObj.source = dataEntry.srcObj;
            }
            if(dataEntry.destObj != undefined) {
                objArr[dataEntry.destObj] = 1;
                tObj.target = dataEntry.destObj;
            }

            tObj.value = dataEntry.traffic;
            links.push(tObj);
        });
        graph.links = links;
        console.dir(objArr);
        console.dir(links);
        var nodes = [];
        for(entry in objArr) {
            var tObj = {};
            tObj.id = entry;
            tObj.group = 1;

            nodes.push(tObj);
        }
        console.dir(nodes);
        graph.nodes = nodes;
        return graph;
    }

    function createGraph1(graph) {
        var svg = d3.select("#svgchart1"),
            width = +svg.attr("width"),
            height = +svg.attr("height");

        var color = d3.scaleOrdinal(d3.schemeCategory20);

        var simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(200))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));


        var link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(graph.links)
            .enter().append("line")
            .attr("stroke-width", function(d) { return 1; })
            .attr("stroke", function (d) {
                if(d.value > 15000)
                    return "Red";
                else if(d.value > 10000)
                    return "Blue";
                else if(d.value > 5000)
                    return "Yellow";
                else
                    return "Green";
            });

        link.append("title")
            .text(function(d) { return d.value; });

        var elem = svg.selectAll("g myCircleText")
            .data(graph.nodes);

        /*Create and place the "blocks" containing the circle and the text */
        var elemEnter = elem.enter()
            .append("g");

        /*Create the circle for each block */
        var circle = elemEnter.append("circle")
            .attr("r", 30 )
            .attr("stroke","black")
            .attr("fill", d3.rgb(31, 119, 180))
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        /* Create the text for each block */
        var circleText = elemEnter.append("text")
            .text(function(d){return d.id});

        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        function ticked() {
            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            circle
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });

            circleText
                .attr("dx", function (d) { return d.x - 11; })
                .attr("dy", function (d) { return d.y + 3; });
        }

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
            if(d.fx > 1000)
                d.fx = 1000;
            if(d.fx < 35)
                d.fx = 35;
            if(d.fy > 500)
                d.fy = 500;
            if(d.fy < 35)
                d.fy = 35;
        }

        function dragended(d) {
            // if (!d3.event.active) simulation.alphaTarget(0);
            // d.fx = null;
            // d.fy = null;
        }

        var colorDesc = svg.append('g')
            .attr('transform','translate(' + (width - 850) + ', ' + (height - 60) +')');

        colorDesc.append('text')
            .text('Traffic Description: ');

        colorDesc.append('circle')
            .attr('cx', 130)
            .attr('cy', -4)
            .attr('r', 5)
            .attr('fill', "red")

        colorDesc.append('text')
            .attr('x', 140)
            .attr('y', 1)
            .text('> 15000 bytes');

        colorDesc.append('circle')
            .attr('cx', 260)
            .attr('cy', -4)
            .attr('r', 5)
            .attr('fill', "blue")

        colorDesc.append('text')
            .attr('x', 270)
            .attr('y', 1)
            .text('> 10000 bytes');

        colorDesc.append('circle')
            .attr('cx', 380)
            .attr('cy', -4)
            .attr('r', 5)
            .attr('fill', "yellow")

        colorDesc.append('text')
            .attr('x', 390)
            .attr('y', 1)
            .text('> 5000 bytes');

        colorDesc.append('circle')
            .attr('cx', 500)
            .attr('cy', -4)
            .attr('r', 5)
            .attr('fill', "green")

        colorDesc.append('text')
            .attr('x', 510)
            .attr('y', 1)
            .text('< 5000 bytes');
    }

    function createGraph2(miserables) {

        function createAdjacencyMatrix(nodes,edges) {
            var edgeHash = {};
            for (x in edges) {
                var id = edges[x].source + "-" + edges[x].target;
                edgeHash[id] = edges[x];
            }
            matrix = [];
            //create all possible edges
            for (a in nodes) {
                for (b in nodes) {
                    var grid = {id: nodes[a].id + "-" + nodes[b].id, x: b, y: a, value: 0};
                    if (edgeHash[grid.id]) {
                        grid.value = edgeHash[grid.id].value;
                    }
                    matrix.push(grid);
                }
            }

            d3.select("#svgchart2")
                .append("g")
                .attr("transform", "translate(370,80)")
                .attr("id", "adjacencyG")
                .selectAll("rect")
                .data(matrix)
                .enter()
                .append("rect")
                .attr("width", 25)
                .attr("height", 25)
                .attr("x", function (d) {return d.x * 25})
                .attr("y", function (d) {return d.y * 25})
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .style("fill", "red")
                .style("fill-opacity", function (d) {return d.value * .00005})
                .on("mouseover", gridOver)
                .append("title")
                .text(function(d) { return d.value; });

            var scaleSize = nodes.length * 25;
            var nameScale = d3.scalePoint().domain(nodes.map(function (el) {return el.id})).range([13,scaleSize - 13],1);

            xAxis = d3.axisTop().scale(nameScale).tickSize(4);
            yAxis = d3.axisLeft().scale(nameScale).tickSize(4);
            d3.select("#adjacencyG").append("g").call(xAxis).selectAll("text").style("text-anchor", "end").attr("transform", "translate(-10,-10) rotate(90)");
            d3.select("#adjacencyG").append("g").call(yAxis);

            function gridOver(d,i) {
                d3.selectAll("rect").style("stroke-width", function (p) {return p.x == d.x || p.y == d.y ? "3px" : "1px"})
            }
        }
        createAdjacencyMatrix(miserables.nodes, miserables.links);
    }

    function clearGraphs() {
        $("#svgchart1").html('');
        $("#svgchart2").html('');
    }

    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
            clearGraphs();
            var graph = prepareData(data);
            var temp = JSON.parse(JSON.stringify(graph));
            createGraph1(graph);
            createGraph2(temp);

            if(!frozen) {
                timeout = setTimeout(function () {
                    df2.repeatOnce();
                }, 5000);
            }
        },
        "stateFetchingFailure": function(event, data) {
            setTimeout(function() {
                df2.repeatOnce();
            }, 1000);
        }
    });

    $(".frozenlink").click(function () {
        var parent = $(this).parent();
        var id = parent.attr('id');
        $(parent).attr('class', 'active');
        if(id == "continuousli") {
            $('#frozenli').removeClass('active');
            frozen = false;
            df2.repeatOnce();
        }
        else {
            $('#continuousli').removeClass('active');
            frozen = true;
            clearTimeout(timeout);
        }
    });

    df2.start();
})();