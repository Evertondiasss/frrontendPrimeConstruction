// Tilt effect for all cards except div6 and div7
document.querySelectorAll('.card:not(.div6):not(.div7)').forEach(card => {
    card.addEventListener('mousemove', handleTilt);
    card.addEventListener('mouseleave', resetTilt);
});

function handleTilt(e) {
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    
    const mouseX = e.clientX - cardCenterX;
    const mouseY = e.clientY - cardCenterY;
    
    const rotateX = (-mouseY / (cardRect.height / 2)) * 10;
    const rotateY = (mouseX / (cardRect.width / 2)) * 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
}

// Area Chart Creation
const ctx = document.getElementById('areaChart').getContext('2d');

// Create gradients
const mainGradient = ctx.createLinearGradient(0, 0, 0, 300);
mainGradient.addColorStop(0, '#0f2230');
mainGradient.addColorStop(1, 'rgba(15, 34, 48, 0.1)');

const overlay1Gradient = ctx.createLinearGradient(0, 0, 0, 300);
overlay1Gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
overlay1Gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');

const overlay2Gradient = ctx.createLinearGradient(0, 0, 0, 300);
overlay2Gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
overlay2Gradient.addColorStop(1, 'rgba(0, 0, 0, 0.02)');

// Sample data
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mainData = [50000, 65000, 75000, 90000, 82000, 95000, 110000, 105000, 98000, 120000, 125000, 135000];
const overlay1Data = mainData.map(value => value * 0.8);
const overlay2Data = mainData.map(value => value * 0.6);

// Create the area chart
new Chart(ctx, {
    type: 'line',
    data: {
        labels: months,
        datasets: [
            {
                label: 'Total de Serviços',
                data: mainData,
                fill: true,
                backgroundColor: mainGradient,
                borderColor: '#0f2230',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            },
            {
                label: 'Overlay 1',
                data: overlay1Data,
                fill: true,
                backgroundColor: overlay1Gradient,
                borderColor: 'transparent',
                pointRadius: 0,
                tension: 0.4
            },
            {
                label: 'Overlay 2',
                data: overlay2Data,
                fill: true,
                backgroundColor: overlay2Gradient,
                borderColor: 'transparent',
                pointRadius: 0,
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(15, 34, 48, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'white',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: function(context) {
                        if (context.datasetIndex === 0) {
                            let value = context.parsed.y;
                            return `Total: R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        }
                        return null;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'white'
                }
            },
            y: {
                display: false,
                grid: {
                    display: false
                }
            }
        }
    }
});

// Donut Chart Creation
const donutCtx = document.getElementById('donutChart').getContext('2d');

// Sample data for donut chart
const materialExpenses = 75000;
const serviceExpenses = 125000;
const totalExpenses = materialExpenses + serviceExpenses;

// Function to format number to K format
function formatToK(number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(0) + 'K';
    }
    return number.toString();
}

// Function to format currency
function formatCurrency(value) {
    return `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// Create the donut chart
new Chart(donutCtx, {
    type: 'doughnut',
    data: {
        labels: ['Material', 'Serviços'],
        datasets: [{
            data: [materialExpenses, serviceExpenses],
            backgroundColor: ['#ffffff', '#0f2230'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15, 34, 48, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                callbacks: {
                    label: function(context) {
                        let value = context.raw;
                        let label = context.label;
                        return `${label}: ${formatCurrency(value)}`;
                    }
                }
            }
        },
        onClick: function(event, elements) {
            if (elements.length === 0) {
                // Clicked on center
                const tooltip = this.tooltip;
                tooltip.setActiveElements([], {
                    x: event.x,
                    y: event.y
                });
                
                const tooltipModel = {
                    opacity: 1,
                    title: ['Total'],
                    body: [[{
                        text: formatCurrency(totalExpenses)
                    }]],
                    dataPoints: []
                };
                
                tooltip.update(true);
                tooltip.title = tooltipModel.title;
                tooltip.body = tooltipModel.body;
                tooltip.setActiveElements(tooltipModel.dataPoints, {
                    x: event.x,
                    y: event.y
                });
                
                this.update();
            }
        }
    },
    plugins: [{
        id: 'centerText',
        beforeDraw: function(chart) {
            const width = chart.width;
            const height = chart.height;
            const ctx = chart.ctx;
            
            ctx.restore();
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = formatToK(totalExpenses);
            
            ctx.fillText(text, width / 2, height / 2);
            ctx.save();
        }
    }]
}); 