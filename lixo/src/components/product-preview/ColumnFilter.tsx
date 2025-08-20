import React, { useState, useEffect } from 'react';
import { Button, Popover, List, Input, Checkbox, Space, Typography } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Search } = Input;
const { Text } = Typography;

interface ColumnFilterProps {
  column: string;
  values: string[];
  selectedValues: Set<string>;
  onFilter: (values: Set<string>) => void;
}

const FilterContainer = styled.div`
  padding: 12px;
  min-width: 200px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
`;

const FilterHeader = styled.div`
  margin-bottom: 12px;
`;

const FilterList = styled(List)`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
`;

const FilterFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const ColumnFilter: React.FC<ColumnFilterProps> = ({
  column,
  values,
  selectedValues,
  onFilter,
}) => {
  const [searchText, setSearchText] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(selectedValues);
  const [filteredValues, setFilteredValues] = useState<string[]>(values);

  useEffect(() => {
    const filtered = values.filter((value) =>
      value.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredValues(filtered);
  }, [searchText, values]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleSelectAll = () => {
    setLocalSelected(new Set(filteredValues));
  };

  const handleClearAll = () => {
    setLocalSelected(new Set());
  };

  const handleToggleValue = (value: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setLocalSelected(newSelected);
  };

  const handleApply = () => {
    onFilter(localSelected);
  };

  const content = (
    <FilterContainer>
      <FilterHeader>
        <Search
          placeholder="Buscar valores"
          onChange={(e) => handleSearch(e.target.value)}
          value={searchText}
        />
      </FilterHeader>

      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={handleSelectAll}>
          Selecionar tudo
        </Button>
        <Button size="small" onClick={handleClearAll}>
          Limpar
        </Button>
      </Space>

      <FilterList
        size="small"
        dataSource={filteredValues}
        renderItem={(item) => (
          <List.Item style={{ padding: '4px 0' }}>
            <Checkbox
              checked={localSelected.has(item)}
              onChange={() => handleToggleValue(item)}
            >
              {item || '(Espaços em branco)'}
            </Checkbox>
          </List.Item>
        )}
      />

      <FilterFooter>
        <Text type="secondary">
          {localSelected.size} de {values.length} selecionados
        </Text>
        <Button type="primary" size="small" onClick={handleApply}>
          OK
        </Button>
      </FilterFooter>
    </FilterContainer>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottom"
      overlayStyle={{ padding: 0 }}
    >
      <Button
        icon={<FilterOutlined />}
        size="small"
        type={selectedValues.size < values.length ? 'primary' : 'default'}
      />
    </Popover>
  );
};

export default ColumnFilter; 