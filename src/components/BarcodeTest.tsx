import React, { useState } from 'react';
import { BarcodeGenerator } from './BarcodeGenerator';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function BarcodeTest() {
  const [orderId, setOrderId] = useState('#B21432');
  const [productTitle, setProductTitle] = useState('Chocolate Birthday Cake');
  const [dueDate, setDueDate] = useState('2025-02-15');
  const [store, setStore] = useState<'bannos' | 'flourlane'>('bannos');

  const handlePrint = () => {
    // Let BarcodeGenerator handle the actual printing by not providing custom handlers
  };

  const handleDownload = () => {
    // Let BarcodeGenerator handle the actual downloading by not providing custom handlers
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Barcode Generation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="#B21432"
              />
            </div>
            <div>
              <Label htmlFor="productTitle">Product Title</Label>
              <Input
                id="productTitle"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="Chocolate Birthday Cake"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="store">Store</Label>
              <Select value={store} onValueChange={(value: 'bannos' | 'flourlane') => setStore(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bannos">Bannos</SelectItem>
                  <SelectItem value="flourlane">Flourlane</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <BarcodeGenerator
        orderId={orderId}
        productTitle={productTitle}
        dueDate={dueDate}
        store={store}
        className="mt-4"
      />
    </div>
  );
}

export default BarcodeTest;
