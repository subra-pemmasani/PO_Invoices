import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';

export default function DashboardCharts({ summary }) {
  if (!summary) return null;

  return (
    <div className="charts-grid">
      <div className="panel chart">
        <h3>Budget vs Committed / Invoiced / Cleared by Cost Code</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summary.budgetSummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="costCode" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="budget" fill="#8884d8" />
            <Bar dataKey="committed" fill="#82ca9d" />
            <Bar dataKey="invoiced" fill="#ffc658" />
            <Bar dataKey="cleared" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel chart">
        <h3>Monthly Spend Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={summary.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
