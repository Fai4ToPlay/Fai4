'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { api } from '../lib/api';

const { Header, Content, Sider } = Layout;

const menuItems = [
  'Главная',
  'Создание актов',
  'Список актов',
  'Подрядчики',
  'Коммерческие предложения (КП)',
  'Дефекты оборудования',
  'Настройки',
  'Экспорт/Импорт'
].map((label) => ({ key: label, label }));

export default function HomePage() {
  const { message } = App.useApp();
  const [section, setSection] = useState(menuItems[0].key);
  const [acts, setActs] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);

  const loadAll = async () => {
    try {
      const [actsData, contractorsData] = await Promise.all([
        api<any[]>('/acts'),
        api<any[]>('/contractors')
      ]);
      setActs(actsData);
      setContractors(contractorsData);
    } catch {
      message.warning('Нужна авторизация: используйте API /auth/login и сохраните token в localStorage');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <App>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="light">
          <div style={{ padding: 16, fontWeight: 600 }}>FAI4 Акты</div>
          <Menu selectedKeys={[section]} mode="inline" items={menuItems} onClick={(e) => setSection(e.key)} />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>{section}</Typography.Title>
          </Header>
          <Content style={{ padding: 16 }}>
            {section === 'Главная' && <Dashboard acts={acts} />}
            {section === 'Создание актов' && <ActEditor contractors={contractors} onCreated={loadAll} />}
            {section === 'Список актов' && <ActList acts={acts} onRefresh={loadAll} />}
            {section === 'Подрядчики' && <ContractorsDirectory contractors={contractors} onRefresh={loadAll} />}
            {section === 'Коммерческие предложения (КП)' && <CommercialOfferBuilder />}
            {section === 'Дефекты оборудования' && <EquipmentDefectForm contractors={contractors} onCreated={loadAll} />}
            {section === 'Настройки' && <Settings />}
            {section === 'Экспорт/Импорт' && <ImportExport />}
          </Content>
        </Layout>
      </Layout>
    </App>
  );
}

function Dashboard({ acts }: { acts: any[] }) {
  const byType = useMemo(() => Object.groupBy(acts, (a) => a.act_type), [acts]);
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text>Всего актов: {acts.length}</Typography.Text>
      <Space wrap>
        {Object.entries(byType).map(([type, values]) => (
          <Tag key={type}>{type}: {values?.length || 0}</Tag>
        ))}
      </Space>
    </Space>
  );
}

function ActEditor({ contractors, onCreated }: { contractors: any[]; onCreated: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [rows, setRows] = useState([{ key: 1 }]);

  const onFinish = async (values: any) => {
    const defects = rows.map((r: any, i) => ({
      description: values[`defect_${r.key}`],
      location: values[`location_${r.key}`],
      responsible: values[`resp_${r.key}`],
      due_date: values[`due_${r.key}`]?.format?.('YYYY-MM-DD')
    }));
    await api('/acts', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        act_date: values.act_date.format('YYYY-MM-DD'),
        defects,
        form_payload: values
      })
    });
    message.success('Акт создан');
    form.resetFields();
    setRows([{ key: 1 }]);
    onCreated();
  };

  return (
    <Form layout="vertical" form={form} onValuesChange={() => localStorage.setItem('draft_act', JSON.stringify(form.getFieldsValue()))} onFinish={onFinish}>
      <Tabs
        items={[
          {
            key: '1',
            label: 'Для заполнения',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="act_number" label="Номер акта" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="act_type" label="Тип акта" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'act_detected', label: 'Акт выявленных' },
                    { value: 'act_detected_3d', label: 'Акт выявленных 3 дня' },
                    { value: 'act_fixed', label: 'Акт об устранении' }
                  ]} />
                </Form.Item>
                <Form.Item name="act_date" label="Дата составления акта" rules={[{ required: true }]}><DatePicker /></Form.Item>
                <Form.Item name="representative_position" label="Должность представителя застройщика"><Input /></Form.Item>
                <Form.Item name="representative_last_name" label="Фамилия представителя застройщика"><Input /></Form.Item>
                <Form.Item name="commission_position" label="Должность члена комиссии"><Input /></Form.Item>
                <Form.Item name="commission_last_name" label="Фамилия члена комиссии"><Input /></Form.Item>
                <Form.Item name="contractor_id" label="Подрядчик">
                  <Select options={contractors.map((c) => ({ value: c.id, label: c.org_name }))} showSearch />
                </Form.Item>
                <Form.Item name="object_name" label="Объект"><Input /></Form.Item>
                <Form.Item name="title" label="Заголовок"><Input /></Form.Item>
              </Space>
            )
          },
          {
            key: '2',
            label: 'Акт выявленных',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {rows.map((r, index) => (
                  <Space key={r.key} align="start" wrap>
                    <Typography.Text>{index + 1}</Typography.Text>
                    <Form.Item name={`defect_${r.key}`} label="Описание дефекта"><Input /></Form.Item>
                    <Form.Item name={`location_${r.key}`} label="Местоположение"><Input /></Form.Item>
                    <Form.Item name={`resp_${r.key}`} label="Ответственный"><Input /></Form.Item>
                    <Form.Item name={`due_${r.key}`} label="Срок"><DatePicker /></Form.Item>
                    <Button danger onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}>Удалить</Button>
                  </Space>
                ))}
                <Button onClick={() => setRows((prev) => [...prev, { key: Date.now() }])}>Добавить строку</Button>
              </Space>
            )
          }
        ]}
      />
      <Button type="primary" htmlType="submit">Сохранить акт</Button>
    </Form>
  );
}

function ActList({ acts, onRefresh }: { acts: any[]; onRefresh: () => void }) {
  const columns = [
    { title: 'Номер', dataIndex: 'act_number' },
    { title: 'Тип', dataIndex: 'act_type' },
    { title: 'Дата', dataIndex: 'act_date' },
    { title: 'Подрядчик', dataIndex: 'contractor_name' },
    {
      title: 'Экспорт',
      render: (_: any, row: any) => (
        <Space>
          <a href={`http://localhost:4000/api/acts/${row.id}/export/pdf`} target="_blank">PDF</a>
          <a href={`http://localhost:4000/api/acts/${row.id}/export/excel`} target="_blank">Excel</a>
        </Space>
      )
    }
  ];
  return <Table rowKey="id" columns={columns} dataSource={acts} onChange={() => onRefresh()} />;
}

function ContractorsDirectory({ contractors, onRefresh }: { contractors: any[]; onRefresh: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="inline" form={form} onFinish={async (v) => {
        await api('/contractors', { method: 'POST', body: JSON.stringify(v) });
        message.success('Добавлено');
        form.resetFields();
        onRefresh();
      }}>
        <Form.Item name="org_name" rules={[{ required: true }]}><Input placeholder="Организация" /></Form.Item>
        <Form.Item name="contact"><Input placeholder="Контакт" /></Form.Item>
        <Form.Item name="phone"><Input placeholder="Телефон" /></Form.Item>
        <Form.Item name="email"><Input placeholder="Email" /></Form.Item>
        <Button type="primary" htmlType="submit">Добавить</Button>
      </Form>
      <Table
        rowKey="id"
        dataSource={contractors}
        columns={[
          { title: '№', dataIndex: 'num' },
          { title: 'Название организации', dataIndex: 'org_name' },
          { title: 'Контакт', dataIndex: 'contact' },
          { title: 'Телефон', dataIndex: 'phone' },
          { title: 'Email', dataIndex: 'email' }
        ]}
      />
    </Space>
  );
}

function CommercialOfferBuilder() {
  const [items, setItems] = useState([{ key: 1, name: '', qty: 1, price: 0 }]);
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {items.map((item, idx) => (
        <Space key={item.key}>
          <Typography.Text>{idx + 1}</Typography.Text>
          <Input placeholder="Наименование" value={item.name} onChange={(e) => setItems((p) => p.map((x) => x.key === item.key ? { ...x, name: e.target.value } : x))} />
          <InputNumber placeholder="Кол-во" value={item.qty} onChange={(v) => setItems((p) => p.map((x) => x.key === item.key ? { ...x, qty: Number(v || 0) } : x))} />
          <InputNumber placeholder="Цена" value={item.price} onChange={(v) => setItems((p) => p.map((x) => x.key === item.key ? { ...x, price: Number(v || 0) } : x))} />
          <Typography.Text>{(item.qty * item.price).toFixed(2)}</Typography.Text>
        </Space>
      ))}
      <Button onClick={() => setItems((p) => [...p, { key: Date.now(), name: '', qty: 1, price: 0 }])}>Добавить строку</Button>
      <Typography.Title level={5}>Итого: {total.toFixed(2)}</Typography.Title>
    </Space>
  );
}

function EquipmentDefectForm({ contractors, onCreated }: { contractors: any[]; onCreated: () => void }) {
  return (
    <Form layout="vertical" onFinish={async (v) => {
      await api('/acts', { method: 'POST', body: JSON.stringify({
        ...v,
        title: 'Акт дефекта оборудования',
        act_type: v.act_type,
        act_date: v.act_date.format('YYYY-MM-DD')
      }) });
      onCreated();
    }}>
      <Form.Item name="act_number" label="Номер" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="act_type" label="Тип" initialValue="equipment_defect">
        <Select options={[{ value: 'equipment_defect', label: 'Обычный' }, { value: 'equipment_defect_3d', label: '3 день' }]} />
      </Form.Item>
      <Form.Item name="act_date" label="Дата" rules={[{ required: true }]}><DatePicker /></Form.Item>
      <Form.Item name="object_name" label="Описание оборудования"><Input /></Form.Item>
      <Form.Item name="form_payload" label="Описание дефекта"><Input.TextArea rows={4} /></Form.Item>
      <Form.Item name="contractor_id" label="Ответственный">
        <Select options={contractors.map((c) => ({ value: c.id, label: c.org_name }))} />
      </Form.Item>
      <Button type="primary" htmlType="submit">Создать</Button>
    </Form>
  );
}

function Settings() {
  return <Typography.Text>Роли (admin/user), параметры PDF, словари и шаблоны листов настраиваются через API /system.</Typography.Text>;
}

function ImportExport() {
  return (
    <Space direction="vertical">
      <Typography.Text>Импорт Excel (.xlsm/.xlsx): POST /api/system/import/excel (multipart/form-data, field=file)</Typography.Text>
      <Typography.Text>Экспорт каждого акта доступен в разделе «Список актов».</Typography.Text>
    </Space>
  );
}
