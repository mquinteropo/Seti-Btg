import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import DataTable from 'react-data-table-component';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [funds, setFunds] = useState([]);
  const [balance, setBalance] = useState(500000);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [isSubmittingSubscription, setIsSubmittingSubscription] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [subscribeForm, setSubscribeForm] = useState({
    fundId: '',
    fundName: '',
    minAmount: 0,
    amount: '',
    notifyBy: 'email'
  });

  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const txRes = await api.get(`/api/funds/history/${user.userId}`);
      setTransactions(txRes.data);

      let currentBalance = 500000;
      txRes.data.forEach((tx) => {
        if (tx.type === 'SUBSCRIPTION') {
          currentBalance -= parseFloat(tx.amount);
        } else if (tx.type === 'CANCELLATION') {
          currentBalance += parseFloat(tx.amount);
        }
      });
      setBalance(currentBalance);

      setFunds([
        { id: 'FPV_BTG_PACTUAL_RECAUDADORA', name: 'FPV BTG Pactual Recaudadora', minAmount: 75000, category: 'FPV' },
        { id: 'FPV_BTG_PACTUAL_ECOPETROL', name: 'FPV BTG Pactual Ecopetrol', minAmount: 125000, category: 'FPV' },
        { id: 'DEUDAPRIVADA', name: 'Deuda Privada', minAmount: 50000, category: 'FIC' },
        { id: 'FDO-ACCIONES', name: 'FDO-Acciones', minAmount: 250000, category: 'FIC' },
        { id: 'FPV_BTG_PACTUAL_DINAMICA', name: 'FPV BTG Pactual Dinámica', minAmount: 100000, category: 'FPV' }
      ]);

      setLoading(false);
    } catch (err) {
      setError('Error al cargar datos');
      setLoading(false);
    }
  };

  const openSubscribeModal = (fund) => {
    setSubscribeError('');
    setSubscribeForm({
      fundId: fund.id,
      fundName: fund.name,
      minAmount: fund.minAmount,
      amount: String(fund.minAmount),
      notifyBy: 'email'
    });
    setIsSubscribeModalOpen(true);
  };

  const closeSubscribeModal = () => {
    if (isSubmittingSubscription) return;
    setIsSubscribeModalOpen(false);
    setSubscribeError('');
  };

  const submitSubscription = async (e) => {
    e.preventDefault();
    setSubscribeError('');

    const numAmount = parseFloat(subscribeForm.amount);
    if (isNaN(numAmount) || numAmount < subscribeForm.minAmount) {
      setSubscribeError(`El monto debe ser al menos $${subscribeForm.minAmount.toLocaleString()}.`);
      return;
    }

    if (numAmount > balance) {
      setSubscribeError(`No tienes saldo suficiente. Balance actual: $${balance.toLocaleString()}.`);
      return;
    }

    setIsSubmittingSubscription(true);
    try {
      await api.post('/api/funds/subscribe', {
        fundId: subscribeForm.fundId,
        amount: numAmount,
        notifyBy: subscribeForm.notifyBy
      });

      setIsSubscribeModalOpen(false);
      setFeedbackModal({
        open: true,
        title: 'Suscripción exitosa',
        message: `Te notificaremos por ${subscribeForm.notifyBy === 'sms' ? 'SMS' : 'email'}.`
      });
      await loadData();
    } catch (err) {
      setSubscribeError(err.response?.data?.error || 'Error al suscribirse');
    } finally {
      setIsSubmittingSubscription(false);
    }
  };

  const handleCancel = async (fundId) => {
    if (!confirm('¿Estás seguro de cancelar esta suscripción?')) return;

    try {
      await api.post('/api/funds/cancel', { fundId, notifyBy: 'email' });
      setFeedbackModal({
        open: true,
        title: 'Cancelación exitosa',
        message: 'La cancelación se realizó correctamente. Revisa tu email.'
      });
      loadData();
    } catch (err) {
      setFeedbackModal({
        open: true,
        title: 'No se pudo cancelar',
        message: err.response?.data?.error || 'Error al cancelar'
      });
    }
  };

  const isSubscribed = (fundId) => {
    const subscriptions = transactions.filter((tx) => tx.fund_id === fundId && tx.type === 'SUBSCRIPTION');
    const cancellations = transactions.filter((tx) => tx.fund_id === fundId && tx.type === 'CANCELLATION');
    return subscriptions.length > cancellations.length;
  };

  // Configuración de columnas para DataTable
  const columns = [
    {
      name: 'Fecha',
      selector: row => row.date,
      sortable: true,
      format: row => new Date(row.date).toLocaleString(),
      width: '200px'
    },
    {
      name: 'Fondo',
      selector: row => row.fund_id,
      sortable: true,
      wrap: true
    },
    {
      name: 'Tipo',
      selector: row => row.type,
      sortable: true,
      cell: row => (
        <span style={row.type === 'SUBSCRIPTION' ? styles.typeSub : styles.typeCancel}>
          {row.type === 'SUBSCRIPTION' ? 'Suscripción' : 'Cancelación'}
        </span>
      ),
      width: '140px'
    },
    {
      name: 'Monto',
      selector: row => row.amount,
      sortable: true,
      format: row => `$${parseFloat(row.amount).toLocaleString()}`,
      right: true,
      width: '140px'
    }
  ];

  // Estilos personalizados para DataTable
  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #ddd',
        minHeight: '48px'
      }
    },
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        paddingLeft: '12px',
        paddingRight: '12px'
      }
    },
    rows: {
      style: {
        minHeight: '48px',
        '&:hover': {
          backgroundColor: '#f8f9fa',
          cursor: 'pointer'
        }
      }
    },
    cells: {
      style: {
        paddingLeft: '12px',
        paddingRight: '12px',
        fontSize: '14px'
      }
    },
    pagination: {
      style: {
        borderTop: '1px solid #ddd',
        minHeight: '56px'
      },
      pageButtonsStyle: {
        borderRadius: '5px',
        height: '36px',
        width: '36px',
        padding: '4px',
        margin: '2px',
        cursor: 'pointer',
        transition: '0.2s',
        color: '#667eea',
        fill: '#667eea',
        '&:disabled': {
          cursor: 'not-allowed',
          color: '#d1d5db',
          fill: '#d1d5db'
        },
        '&:hover:not(:disabled)': {
          backgroundColor: '#667eea',
          color: 'white',
          fill: 'white'
        }
      }
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando...</div>;
  }

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>BTG Pactual - Dashboard</h1>
          <div style={styles.userInfo}>
            <span style={styles.username}>Usuario: {user?.userId}</span>
            <span style={styles.balance}>Balance: ${balance.toLocaleString()}</span>
            <button onClick={logout} style={styles.logoutBtn}>Cerrar sesión</button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Fondos disponibles</h2>
          <div style={styles.fundsGrid}>
            {funds.map((fund) => (
              <div key={fund.id} style={styles.fundCard}>
                <h3 style={styles.fundName}>{fund.name}</h3>
                <p style={styles.fundCategory}>Categoría: {fund.category}</p>
                <p style={styles.fundMinAmount}>Monto mínimo: ${fund.minAmount.toLocaleString()}</p>
                <div style={styles.fundActions}>
                  {isSubscribed(fund.id) ? (
                    <>
                      <span style={styles.subscribed}>✓ Suscrito</span>
                      <button onClick={() => handleCancel(fund.id)} style={styles.cancelBtn}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => openSubscribeModal(fund)} style={styles.subscribeBtn}>
                      Suscribirse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Historial de transacciones</h2>
          <DataTable
            columns={columns}
            data={transactions}
            pagination
            paginationPerPage={5}
            paginationRowsPerPageOptions={[5, 10, 15, 20]}
            customStyles={customStyles}
            noDataComponent={<p style={styles.noTransactions}>No hay transacciones aún</p>}
            highlightOnHover
            pointerOnHover
            responsive
            defaultSortFieldId={1}
            defaultSortAsc={false}
            paginationComponentOptions={{
              rowsPerPageText: 'Filas por página:',
              rangeSeparatorText: 'de',
              noRowsPerPage: false,
              selectAllRowsItem: false,
              selectAllRowsItemText: 'Todos'
            }}
          />
        </div>
      </div>

      {isSubscribeModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Suscribirse al fondo</h3>
            <p style={styles.modalText}>{subscribeForm.fundName}</p>
            <form onSubmit={submitSubscription}>
              <label style={styles.modalLabel}>Monto a invertir</label>
              <input
                type="number"
                min={subscribeForm.minAmount}
                step="1000"
                value={subscribeForm.amount}
                onChange={(e) => setSubscribeForm({ ...subscribeForm, amount: e.target.value })}
                style={styles.modalInput}
                required
              />
              <small style={styles.modalHint}>Mínimo: ${subscribeForm.minAmount.toLocaleString()}</small>

              <label style={styles.modalLabel}>Canal de notificación</label>
              <select
                value={subscribeForm.notifyBy}
                onChange={(e) => setSubscribeForm({ ...subscribeForm, notifyBy: e.target.value })}
                style={styles.modalSelect}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>

              {subscribeError && <div style={styles.modalError}>{subscribeError}</div>}

              <div style={styles.modalActions}>
                <button type="button" style={styles.secondaryBtn} onClick={closeSubscribeModal}>
                  Cancelar
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={isSubmittingSubscription}>
                  {isSubmittingSubscription ? 'Procesando...' : 'Confirmar suscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {feedbackModal.open && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>{feedbackModal.title}</h3>
            <p style={styles.modalText}>{feedbackModal.message}</p>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => setFeedbackModal({ open: false, title: '', message: '' })}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '20px'
  },
  header: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    margin: 0,
    marginBottom: '15px',
    color: '#333'
  },
  userInfo: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  username: {
    color: '#666',
    fontWeight: '500'
  },
  balance: {
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  logoutBtn: {
    marginLeft: 'auto',
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  section: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    marginTop: 0,
    color: '#333'
  },
  fundsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  fundCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    background: '#fafafa'
  },
  fundName: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '18px'
  },
  fundCategory: {
    color: '#666',
    margin: '5px 0'
  },
  fundMinAmount: {
    color: '#667eea',
    fontWeight: 'bold',
    margin: '5px 0'
  },
  fundActions: {
    marginTop: '15px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  subscribeBtn: {
    flex: 1,
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  cancelBtn: {
    padding: '8px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  subscribed: {
    color: '#28a745',
    fontWeight: 'bold'
  },
  typeSub: {
    color: '#28a745',
    fontWeight: '500'
  },
  typeCancel: {
    color: '#dc3545',
    fontWeight: '500'
  },
  noTransactions: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(16, 24, 40, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    background: 'white',
    borderRadius: '12px',
    padding: '22px',
    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)'
  },
  modalTitle: {
    margin: 0,
    marginBottom: '8px',
    color: '#1f2937'
  },
  modalText: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#4b5563'
  },
  modalLabel: {
    display: 'block',
    marginBottom: '6px',
    color: '#374151',
    fontWeight: '600'
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    marginBottom: '6px',
    boxSizing: 'border-box'
  },
  modalSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    marginBottom: '12px',
    boxSizing: 'border-box'
  },
  modalHint: {
    display: 'block',
    marginBottom: '14px',
    color: '#6b7280'
  },
  modalError: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '14px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px'
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  secondaryBtn: {
    background: '#e5e7eb',
    color: '#111827',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};
