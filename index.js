// ==UserScript==
// @name         SBG Uniques
// @namespace    https://3d.sytes.net/
// @version      1.0.2
// @downloadURL  https://x27.github.io/sbg-uniques/index.js
// @updateURL    https://x27.github.io/sbg-uniques/index.js
// @description  Uniques for SBG
// @author       x27
// @match        https://3d.sytes.net
// @match        https://3d.sytes.net/*
// @grant        none
// ==/UserScript==

window.addEventListener('load', () => setTimeout(main, 1000), false);

async function main() {
    'use strict';

    const STORAGE_KEY = 'plugin-unique-uuids'; 
    const UNIQUE_COLOR= 'magenta';

    const TeamColors = [
        { fill: () => is_dark ? '#AAAAAA80' : '#44444480', stroke: () => is_dark ? '#AAA' : '#444' },
        { fill: '#BB000080', stroke: '#B00' },
        { fill: '#00BB0080', stroke: '#0B0' },
        { fill: '#0088FF80', stroke: '#08F' }
    ]

    function calculateAngle(percent, offset = 0) {
        const full = 2 * Math.PI
        return [
            full * offset - Math.PI / 2,
            full * offset + full * percent - Math.PI / 2
        ]
    }

    let is_dark = JSON.parse(localStorage.getItem('settings')).theme == 'auto'
        ? matchMedia('(prefers-color-scheme: dark)').matches
        : JSON.parse(localStorage.getItem('settings')).theme == 'dark'


    const NeutralUniqueFeatureStyle = (pos) => new ol.style.Style({
        geometry: new ol.geom.Circle(pos, 12),
        fill: new ol.style.Fill({ color: TeamColors[0].fill() }),
        stroke: new ol.style.Stroke({ color: UNIQUE_COLOR, width: 2 }),
});

    const TeamUniqueFeatureStyle = (pos, team, energy) => new ol.style.Style({
        geometry: new ol.geom.Circle(pos, 12),
        renderer: (coords, state) => {
            const ctx = state.context
            const [[xc, yc], [xe, ye]] = coords
            const radius = Math.sqrt((xe - xc) ** 2 + (ye - yc) ** 2)

            ctx.lineWidth = 2
            ctx.strokeStyle = TeamColors[team].stroke
            ctx.fillStyle = TeamColors[team].fill
            ctx.beginPath()
            ctx.arc(xc, yc, radius, ...calculateAngle(1 - energy, energy))
            ctx.lineTo(xc, yc)
            ctx.fill()

            ctx.fillStyle = TeamColors[team].fill
            ctx.strokeStyle = UNIQUE_COLOR
            ctx.beginPath()
            ctx.arc(xc, yc, radius, ...calculateAngle(energy))
            ctx.lineTo(xc, yc)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(xc, yc, radius, 0, 2 * Math.PI)
            ctx.stroke()
        }
    });


    async function getSelfName() {
        return fetch('/api/self', {
            headers: { authorization: `Bearer ${localStorage.getItem('auth')}`, },
            method: "GET",
        })
            .then(r => r.json())
            .then(r => r.n)
            .catch(err => { console.log(`Can't get player name. ${err}`); });
    }

    class CustomXHR extends window.XMLHttpRequest {
        send(body) {
            this.addEventListener('load', _ => {
                let path = this.responseURL.match(/\/api\/point/);
                let response = this.response;
                if (!path) { return; }

                try {
                    response = JSON.parse(response);
                    if (response.data.o == playerName && uniqueIds.indexOf(response.data.g) == -1) {
                        uniqueIds.push(response.data.g);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));
                    }
                } catch (error) {
                    console.log('Parse server response error.', error);
                }
            });
            super.send(body);
        }
    }

    window.XMLHttpRequest = CustomXHR;

    var playerName = await getSelfName();

    var uniqueIds = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []

    ol.source.Vector.prototype.addFeature = function(t) {
        if (t.getGeometry().getType() == 'Point') {
            if (uniqueIds.indexOf(t.getId()) == -1) {
                if (t.getProperties()["team"] == 0) {
                    t.setStyle(NeutralUniqueFeatureStyle(t.getGeometry().getCoordinates()));
                }
                else {
                    t.setStyle(TeamUniqueFeatureStyle(t.getGeometry().getCoordinates(), t.getProperties()["team"], t.getProperties()["energy"]));
                }
            }
        }
        this.addFeatureInternal(t);
        this.changed();
    }
}