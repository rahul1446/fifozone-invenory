export const antdThemeConfig = {
  token: {
    colorPrimary: '#166534', // Brand forest green
    colorSuccess: '#16a34a',
    colorWarning: '#ea580c',
    colorError: '#dc2626',
    colorInfo: '#2563eb',
    colorTextBase: '#1e293b',
    colorBgBase: '#ffffff',
    borderRadius: 8,
    fontFamily: 'Inter, Outfit, sans-serif',
    fontSize: 14,
    controlHeight: 38
  },
  components: {
    Button: {
      colorPrimaryHover: '#15803d',
      controlHeight: 40,
      borderRadius: 8,
      fontWeight: 500
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      rowHoverBg: '#f1f5f9',
      borderRadius: 12
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowCard: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
    },
    Menu: {
      itemBorderRadius: 8,
      itemActiveBg: '#f0fdf4',
      itemSelectedColor: '#166534'
    }
  }
};
