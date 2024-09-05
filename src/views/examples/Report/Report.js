import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";
import { FaCalendarAlt } from "react-icons/fa";
import Header from "components/Headers/ElementHeader";
import axios from "axios";

const decodeToken = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
};

const getDateRange = (period) => {
    const today = new Date();
    let start, end;

    switch (period) {
        case "yesterday":
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            start = yesterday.setHours(0, 0, 0, 0);
            end = yesterday.setHours(23, 59, 59, 999);
            break;
        case "lastWeek":
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() - 7);
            end = new Date(today);
            end.setDate(today.getDate() - today.getDay() - 1);
            start = startOfWeek.setHours(0, 0, 0, 0);
            end = end.setHours(23, 59, 59, 999);
            break;
        case "lastMonth":
            const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            start = startOfMonth.setHours(0, 0, 0, 0);
            end = endOfMonth.setHours(23, 59, 59, 999);
            break;
        case "lastYear":
            const startOfYear = new Date(today.getFullYear() - 1, 0, 1);
            const endOfYear = new Date(today.getFullYear() - 1, 11, 31);
            start = startOfYear.setHours(0, 0, 0, 0);
            end = endOfYear.setHours(23, 59, 59, 999);
            break;
        case "thisYear":
            start = new Date(today.getFullYear(), 0, 1).setHours(0, 0, 0, 0);
            end = new Date(today.getFullYear(), 11, 31).setHours(23, 59, 59, 999);
            break;
        default:
            start = new Date(today.getFullYear(), 0, 1).setHours(0, 0, 0, 0);
            end = new Date(today.getFullYear(), 11, 31).setHours(23, 59, 59, 999);
    }

    return { start, end };
};

const Report = () => {
    const token = localStorage.getItem('token');
    const decodedToken = token ? decodeToken(token) : {};
    const currentUserId = decodedToken.AdminID;

    const [data, setData] = useState({
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
            {
                label: "Paid",
                data: Array(12).fill(0),
                borderColor: "#4c84ff",
                backgroundColor: "transparent",
                borderDash: [5, 5],
            },
        ],
    });

    const [options, setOptions] = useState({
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    beginAtZero: true,
                },
            },
        },
    });

    const [cardData, setCardData] = useState([
        { title: "Paid Invoice", amount: "00.00 €", color: "text-success", period: "thisYear", dropdownOpen: false },
        { title: "Unpaid Invoice", amount: "00.00 €", color: "text-danger", period: "thisYear", dropdownOpen: false },
        { title: "Facture Proforma", amount: "00.00 €", color: "text-primary", period: "thisYear", dropdownOpen: false },
    ]);

    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [paidInvoices, setPaidInvoices] = useState([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [totalPaid, setTotalPaid] = useState("00.00 €");
    const [totalUnpaid, setTotalUnpaid] = useState("00.00 €");

    const fetchCurrencies = async () => {
        try {
            const currencyResponse = await axios.get("http://localhost:5000/api/currency", {
                params: { createdBy: currentUserId }
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrencies(currencyResponse.data.filter(currency => currency.active));
        } catch (error) {
            console.error("Error fetching currencies:", error);
        }
    };

    const fetchInvoices = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/invoices", {
                params: { createdBy: currentUserId }
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const FilterPaidInvoices = response.data.filter(invoice =>
                invoice.paymentStatus === 'Paid' && invoice.type === 'Standard'
            );
            const FilterUnpaidInvoices = response.data.filter(invoice =>
                invoice.paymentStatus === 'Unpaid' && invoice.type === 'Standard'
            );

            setPaidInvoices(FilterPaidInvoices);
            setUnpaidInvoices(FilterUnpaidInvoices);
            updateChartAndTotals(FilterPaidInvoices, FilterUnpaidInvoices);

        } catch (error) {
            console.error("Error fetching invoices:", error);
        }
    };

    const updateChartAndTotals = (paidInvoices, unpaidInvoices) => {
        const cardPeriods = cardData.reduce((acc, card) => {
            acc[card.title] = card.period;
            return acc;
        }, {});

        const { start: paidStart, end: paidEnd } = getDateRange(cardPeriods["Paid Invoice"]);
        const { start: unpaidStart, end: unpaidEnd } = getDateRange(cardPeriods["Unpaid Invoice"]);
        const { start: proformaStart, end: proformaEnd } = getDateRange(cardPeriods["Facture Proforma"]);

        const paidTotalsByCurrency = {};
        const unpaidTotalsByCurrency = {};
        const proformaTotalsByCurrency = {};

        paidInvoices.forEach(invoice => {
            const invoiceDate = new Date(invoice.date);
            if (invoiceDate >= paidStart && invoiceDate <= paidEnd) {
                const currencyId = invoice.currency._id;
                if (!paidTotalsByCurrency[currencyId]) {
                    paidTotalsByCurrency[currencyId] = 0;
                }
                paidTotalsByCurrency[currencyId] += invoice.paidAmount;
            }
        });

        unpaidInvoices.forEach(invoice => {
            const invoiceDate = new Date(invoice.date);
            if (invoiceDate >= unpaidStart && invoiceDate <= unpaidEnd) {
                const currencyId = invoice.currency._id;
                if (!unpaidTotalsByCurrency[currencyId]) {
                    unpaidTotalsByCurrency[currencyId] = 0;
                }
                unpaidTotalsByCurrency[currencyId] += invoice.total;
            }
        });

        if (selectedCurrency) {
            // Format totals for the selected currency
            const paidCurrencyTotal = paidTotalsByCurrency[selectedCurrency._id] || 0;
            const unpaidCurrencyTotal = unpaidTotalsByCurrency[selectedCurrency._id] || 0;

            const formattedPaidTotal = getCurrencySymbolById(selectedCurrency._id, paidCurrencyTotal);
            const formattedUnpaidTotal = getCurrencySymbolById(selectedCurrency._id, unpaidCurrencyTotal);

            const paidMonthlyData = Array(12).fill(0);

            paidInvoices.forEach(invoice => {
                const invoiceDate = new Date(invoice.date);
                if (invoice.currency._id === selectedCurrency._id && invoiceDate >= paidStart && invoiceDate <= paidEnd) {
                    const month = invoiceDate.getMonth();
                    paidMonthlyData[month] += invoice.paidAmount;
                }
            });

            setData(prevData => ({
                ...prevData,
                datasets: [
                    {
                        ...prevData.datasets[0],
                        data: paidMonthlyData,
                    },
                ],
            }));

            setTotalPaid(formattedPaidTotal);
            setTotalUnpaid(formattedUnpaidTotal);

        } else {
            // Reset totals and chart data when no currency is selected
            const formattedPaidTotal = "00.00";
            const formattedUnpaidTotal = "00.00";

            const paidMonthlyData = Array(12).fill(0);

            paidInvoices.forEach(invoice => {
                const invoiceDate = new Date(invoice.date);
                if (invoiceDate >= paidStart && invoiceDate <= paidEnd) {
                    const month = invoiceDate.getMonth();
                    paidMonthlyData[month] += invoice.paidAmount;
                }
            });

            setData(prevData => ({
                ...prevData,
                datasets: [
                    {
                        ...prevData.datasets[0],
                        data: paidMonthlyData,
                    },
                ],
            }));

            setTotalPaid(formattedPaidTotal);
            setTotalUnpaid(formattedUnpaidTotal);
        }
    };

    const handlePeriodSelect = (period, cardTitle) => {
        setCardData(prevCardData =>
            prevCardData.map(card =>
                card.title === cardTitle
                    ? { ...card, period, dropdownOpen: false }
                    : card
            )
        );

        // Close the period dropdown for the specific card
        updateChartAndTotals(
            cardData.find(card => card.title === "Paid Invoice") ? paidInvoices : [],
            cardData.find(card => card.title === "Unpaid Invoice") ? unpaidInvoices : []
        );
    };

    const handleCurrencySelect = (currency) => {
        if (currency) {
            setSelectedCurrency(currency);
        } else {
            setSelectedCurrency(null);
        }
        updateChartAndTotals(paidInvoices, unpaidInvoices);
        setCurrencyDropdownOpen(false);
    };

    const getCurrencySymbolById = (id, price) => {
        const currency = currencies.find(currency => currency._id === id);
        if (!currency) return '';
        if (currency.symbolPosition === "after") {
            return price.toFixed(2) + currency.symbol;
        } else if (currency.symbolPosition === "before") {
            return currency.symbol + price.toFixed(2);
        } else {
            return currency.symbol;
        }
    };

    const toggleDropdown = (dropdown) => {
        setCardData(prevCardData =>
            prevCardData.map(card =>
                card.title.toLowerCase().replace(" ", "") === dropdown
                    ? { ...card, dropdownOpen: !card.dropdownOpen }
                    : card
            )
        );
    };

    const toggleCurrencyDropdown = () => setCurrencyDropdownOpen(!currencyDropdownOpen);

    useEffect(() => {
        fetchCurrencies();
        fetchInvoices();
    }, []);

    useEffect(() => {
        updateChartAndTotals(paidInvoices, unpaidInvoices);
    }, [cardData, selectedCurrency, paidInvoices, unpaidInvoices]);

    useEffect(() => {
        setCardData(prevCardData => [
            { ...prevCardData.find(card => card.title === "Paid Invoice"), amount: totalPaid },
            { ...prevCardData.find(card => card.title === "Unpaid Invoice"), amount: totalUnpaid },
            { ...prevCardData.find(card => card.title === "Facture Proforma"), amount: "00.00 €" },
        ]);
    }, [totalPaid, totalUnpaid]);

    return (
        <>
            <Header />
            <Container className="mt-5" fluid>
                <Row className="mb-4">
                    <Col lg="12" className="mb-4">
                        <Dropdown
                            isOpen={currencyDropdownOpen}
                            toggle={toggleCurrencyDropdown}
                            className="mb-4"
                        >
                            <DropdownToggle caret>
                                {selectedCurrency ? selectedCurrency.name : "Select Currency"}
                            </DropdownToggle>
                            <DropdownMenu>
                                {currencies.map(currency => (
                                    <DropdownItem key={currency._id} onClick={() => handleCurrencySelect(currency)}>
                                        {currency.name}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                    {cardData.map((card, index) => (
                        <Col lg="4" key={index}>
                            <Card className="shadow-sm">
                                <CardHeader className="border-0">
                                    <div className="d-flex justify-content-between">
                                        <h5 className="mb-0">{card.title}</h5>
                                        <Dropdown
                                            isOpen={card.dropdownOpen}
                                            toggle={() => toggleDropdown(card.title.toLowerCase().replace(" ", ""))}
                                            className="d-inline"
                                        >
                                            <DropdownToggle tag="span" caret>
                                                <FaCalendarAlt className="ml-2 cursor-pointer" />
                                            </DropdownToggle>
                                            <DropdownMenu>
                                                <DropdownItem onClick={() => handlePeriodSelect("yesterday", card.title)}>Yesterday</DropdownItem>
                                                <DropdownItem onClick={() => handlePeriodSelect("lastWeek", card.title)}>Last Week</DropdownItem>
                                                <DropdownItem onClick={() => handlePeriodSelect("lastMonth", card.title)}>Last Month</DropdownItem>
                                                <DropdownItem onClick={() => handlePeriodSelect("lastYear", card.title)}>Last Year</DropdownItem>
                                                <DropdownItem onClick={() => handlePeriodSelect("thisYear", card.title)}>This Year</DropdownItem>
                                                <DropdownItem onClick={() => handlePeriodSelect(null, card.title)}>All Year</DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <Row>
                                        <Col>
                                            <p>{card.period === 'thisYear' ? 'This Year' :
                                                card.period === 'lastYear' ? 'Last Year' :
                                                    card.period === 'lastMonth' ? 'Last Month' :
                                                        card.period === 'lastWeek' ? 'Last Week' :
                                                            card.period === 'yesterday' ? 'Yesterday' :
                                                                'All Time'}</p>
                                        </Col>
                                        <Col className="text-right">
                                            <span className={`h2 ${card.color}`}>{card.amount}</span>
                                        </Col>
                                    </Row>
                                </CardBody>

                            </Card>
                        </Col>
                    ))}
                </Row>
                <Card className="shadow-sm">
                    <CardBody>
                        <Line data={data} options={options} />
                    </CardBody>
                </Card>
            </Container>
        </>
    );
};

export default Report;
