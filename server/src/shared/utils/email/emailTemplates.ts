const emailTemplates = (cart, order, translations) => {
  const keys = translations ? translations['keys'] : {};

  function prepareCartItems(items, currency) {
    return items.map((product) => {
      return `<div style="background-color:transparent;">
        <div
            style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
            class="block-grid four-up"
        >
            <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                <div
                    class="col num3"
                    style="max-width: 320px;min-width: 125px;display: table-cell;vertical-align: top;"
                >
                    <div style="background-color: transparent; width: 100% !important;">


                            <div
                                align="center"
                                class="img-container center  autowidth  fullwidth"
                                style="padding-right: 0px;  padding-left: 20px;"
                            >

                                <div style="line-height:10px;font-size:1px"></div>
                                <img
                                    class="center  autowidth  fullwidth"
                                    align="center"
                                    border="0"
                                    src="${
                                      product.item
                                        ? product.item.mainImage
                                          ? product.item.mainImage.url
                                          : ''
                                        : ''
                                    }"
                                    alt="Image"
                                    title="Image"
                                    style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 105px"
                                    width="105"
                                >

                            </div>

                        </div>

                    </div>
                </div>

                <div
                    class="col num3"
                    style="max-width: 320px;min-width: 125px;display: table-cell;vertical-align: top;"
                >
                    <div style="background-color: transparent; width: 100% !important;">


                            <div class>

                                <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 0px; padding-left: 20px; padding-top: 30px; padding-bottom: 0px;">
                                    <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                        <p style="margin: 0;font-size: 12px;line-height: 14px">
                                            <span style="font-size: 14px; line-height: 16px;">${
                                              product.item.title
                                            } </span>
                                        </p>
                                    </div>
                                </div>

                            </div>


                    </div>
                </div>

                <div
                    class="col num3"
                    style="max-width: 320px;min-width: 125px;display: table-cell;vertical-align: top;"
                >
                    <div style="background-color: transparent; width: 100% !important;">


                            <div class>

                                <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 30px; padding-bottom: 10px; float: right;">
                                    <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                        <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: right">
                                            <span style="font-size: 16px; line-height: 19px;">${
                                              product.qty
                                            }ks</span>
                                        </p>
                                    </div>
                                </div>

                            </div>


                    </div>
                </div>

                <div
                    class="col num3"
                    style="max-width: 320px;min-width: 125px;display: table-cell;vertical-align: top;"
                >
                    <div style="background-color: transparent; width: 100% !important;">


                            <div class>

                                <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 25px; padding-left: 10px; padding-top: 25px; padding-bottom: 10px; float: right;">
                                    <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                        <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: right">
                                            <span style="font-size: 16px; line-height: 19px;">${
                                              product.price
                                            } ${currency} </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    });
  }

  return `
        <html xmlns="http://www.w3.org/1999/xhtml":xmlns:v="urn:schemas-microsoft-com:vml":xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
          <meta
              http-equiv="Content-Type"
              content="text/html; charset=utf-8"
          >
          <meta
              name="viewport"
              content="width=device-width"
          >
          <title>Template Base</title>
          <style
              type="text/css"
              id="media-query"
          >
        body {
    margin: 0;
    padding: 0; }

  table, tr, td {
    vertical-align: top;
    border-collapse: collapse; }

  * {
    line-height: inherit; }

  a[x-apple-data-detectors=true] {
    color: inherit !important;
    text-decoration: none !important; }

  [owa] .img-container div, [owa] .img-container button {
    display: block !important; }

  [owa] .fullwidth button {
    width: 100% !important; }

  [owa] .block-grid .col {
    display: table-cell;
    float: none !important;
    vertical-align: top; }

  .ie-browser .num12, .ie-browser .block-grid, [owa] .num12, [owa] .block-grid {
    width: 500px !important; }

  .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
    line-height: 100%; }


  @media only screen and (min-width: 520px) {
    .block-grid {
      width: 500px !important; }
    .block-grid .col {
      vertical-align: top; }
      .block-grid .col.num12 {
        width: 500px !important; }
    .block-grid.mixed-two-up .col.num4 {
      width: 164px !important; }
    .block-grid.mixed-two-up .col.num8 {
      width: 328px !important; }
    .block-grid.two-up .col {
      width: 250px !important; }
    .block-grid.three-up .col {
      width: 166px !important; }
    .block-grid.four-up .col {
      width: 125px !important; }
    .block-grid.five-up .col {
      width: 100px !important; }
    .block-grid.six-up .col {
      width: 83px !important; }
    .block-grid.seven-up .col {
      width: 71px !important; }
    .block-grid.eight-up .col {
      width: 62px !important; }
    .block-grid.nine-up .col {
      width: 55px !important; }
    .block-grid.ten-up .col {
      width: 50px !important; }
    .block-grid.eleven-up .col {
      width: 45px !important; }
    .block-grid.twelve-up .col {
      width: 41px !important; } }

  @media (max-width: 520px) {
    .block-grid, .col {
      min-width: 320px !important;
      max-width: 100% !important;
      display: block !important; }
    .block-grid {
      width: calc(100% - 40px) !important; }
    .col {
      width: 100% !important; }
      .col > div {
        margin: 0 auto; }
    img.fullwidth, img.fullwidthOnMobile {
      max-width: 100% !important; }
    .no-stack .col {
      min-width: 0 !important;
      display: table-cell !important; }
    .no-stack.two-up .col {
      width: 50% !important; }
    .no-stack.mixed-two-up .col.num4 {
      width: 33% !important; }
    .no-stack.mixed-two-up .col.num8 {
      width: 66% !important; }
    .no-stack.three-up .col.num4 {
      width: 33% !important; }
    .no-stack.four-up .col.num3 {
      width: 25% !important; }
    .mobile_hide {
      min-height: 0px;
      max-height: 0px;
      max-width: 0px;
      display: none;
      overflow: hidden;
      font-size: 0px; } }

      </style>
      </head>
      <body
          class="clean-body"
          style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F4F4F4"
      >
          <style
              type="text/css"
              id="media-query-bodytag"
          >
      @media (max-width: 520px) {
        .block-grid {
          min-width: 320px!important;
          max-width: 100%!important;
          width: 100%!important;
          display: block!important;
        }

        .col {
          min-width: 320px!important;
          max-width: 100%!important;
          width: 100%!important;
          display: block!important;
        }

          .col > div {
            margin: 0 auto;
          }

        img.fullwidth {
          max-width: 100%!important;
        }
              img.fullwidthOnMobile {
          max-width: 100%!important;
        }
        .no-stack .col {
                  min-width: 0!important;
                  display: table-cell!important;
              }
              .no-stack.two-up .col {
                  width: 50%!important;
              }
              .no-stack.mixed-two-up .col.num4 {
                  width: 33%!important;
              }
              .no-stack.mixed-two-up .col.num8 {
                  width: 66%!important;
              }
              .no-stack.three-up .col.num4 {
                  width: 33%!important;
              }
              .no-stack.four-up .col.num3 {
                  width: 25%!important;
              }
        .mobile_hide {
          min-height: 0px!important;
          max-height: 0px!important;
          max-width: 0px!important;
          display: none!important;
          overflow: hidden!important;
          font-size: 0px!important;
        }
      }
    </style>
          <table
              class="nl-container"
              style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F4F4F4;width: 100%"
              cellpadding="0"
              cellspacing="0"
          >
              <tbody>
                  <tr style="vertical-align: top">
                      <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">


                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num12"
                                          style="min-width: 320px;max-width: 500px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;text-align:center;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <a style="font-size: 26px; line-height: 31px; color: rgb(153, 153, 153);" href="https://smrtic.eu/">${keys.ESHOP_TITLE || 'Eshop'}
                                                                  </a>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>

                                                  <table
                                                      border="0"
                                                      cellpadding="0"
                                                      cellspacing="0"
                                                      width="100%"
                                                      class="divider"
                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 100%;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                  >
                                                      <tbody>
                                                          <tr style="vertical-align: top">
                                                              <td
                                                                  class="divider_inner"
                                                                  style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;padding-right: 10px;padding-left: 10px;padding-top: 10px;padding-bottom: 10px;min-width: 100%;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                              >
                                                                  <table
                                                                      class="divider_content"
                                                                      align="center"
                                                                      border="0"
                                                                      cellpadding="0"
                                                                      cellspacing="0"
                                                                      width="100%"
                                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                                  >
                                                                      <tbody>
                                                                          <tr style="vertical-align: top">
                                                                              <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                                                                  <span></span>
                                                                              </td>
                                                                          </tr>
                                                                      </tbody>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                      </tbody>
                                                  </table>
                                                  <div>
                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <span style="font-size: 28px; line-height: 33px;">
                                                                      <strong>
                                                                          <span style="line-height: 33px; font-size: 28px;">${keys.Email_order_title ||'Thanks for your order'}</span>
                                                                      </strong>
                                                                  </span>
                                                                  <br>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div>
                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:150%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:18px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px;text-align: center">
                                                                  <span style="font-size: 14px; line-height: 21px;">
                                                                      ${keys.Email_order_subtitle || "You'll receive an email when your items are shipped. If you have any questions, send mail to"}
                                                                  </span>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>

                                                  <div
                                                      align="center"
                                                      class="button-container center"
                                                      style="padding-right: 15px; padding-left: 15px; padding-top:15px; padding-bottom:15px;"
                                                  >

                                                      <div style="color: #ffffff; background-color: #3AAEE0; border-radius: 4px; -webkit-border-radius: 4px; -moz-border-radius: 4px; max-width: 205px; width: 165px;width: auto; border-top: 0px solid transparent; border-right: 0px solid transparent; border-bottom: 0px solid transparent; border-left: 0px solid transparent; padding-top: 15px; padding-right: 20px; padding-bottom: 15px; padding-left: 20px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; text-align: center; mso-border-alt: none;">
                                                          <span style="font-size:12px;line-height:24px;">
                                                              <strong>
                                                                  <a
                                                                      style="font-size: 16px; line-height: 32px; color:#fff; text-decoration: none;"
                                                                      data-mce-style="font-size: 16px; line-height: 32px;" href="https://smrtic.eu/en/orders/${
                                                                        order.orderId
                                                                      }">
                                                                      ${keys.Email_order_link || 'VIEW ORDER STATUS'}

                                                                  </a>
                                                              </strong>
                                                          </span>
                                                      </div>

                                                  </div>


                                          </div>
                                      </div>

                                  </div>
                              </div>
                          </div>
                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid two-up"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#e2e2e2;">

                                      <div
                                          class="col num6"
                                          style="max-width: 320px;min-width: 250px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:150%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="line-height:18px;font-size:12px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                      <strong>${keys.Email_order_summary || 'Summary'}:</strong>
                                                                  </span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">ID: ${order.orderId}</span>
                                                                  <br>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                  ${
                                                                    new Date(order.date).toLocaleDateString()
                                                                  }</span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                  ${keys.Email_order_total || 'Order Total'}: ${ cart.totalPrice + ' ' + order.currency}
                                                                  </span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px"> 
                                                                  <br>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px"> 
                                                                  <br>
                                                              </p>
                                                          </div>
                                                      </div>

                                                  </div>

                                          </div>
                                      </div>

                                      <div
                                          class="col num6"
                                          style="max-width: 320px;min-width: 250px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:150%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:18px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                      <strong>${keys.Email_order_shipping_address || 'SHIPPING ADDRESS'}:</strong>
                                                                  </span>
                                                                  <br>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                  ${
                                                                    order.address.line1
                                                                  }   ${
                                                                    order.address.line2
                                                                  }</span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                  ${
                                                                    order.address.city
                                                                  },${
                                                                    order.address.zip
                                                                  }</span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <span style="font-size: 16px; line-height: 24px;">
                                                                  ${
                                                                    order.address.country
                                                                  }</span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <br>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 18px">
                                                                  <br>
                                                              </p>
                                                          </div>
                                                      </div>

                                                  </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num12"
                                          style="min-width: 320px;max-width: 500px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">

                                                  <table
                                                      border="0"
                                                      cellpadding="0"
                                                      cellspacing="0"
                                                      width="100%"
                                                      class="divider"
                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 100%;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                  >
                                                      <tbody>
                                                          <tr style="vertical-align: top">
                                                              <td
                                                                  class="divider_inner"
                                                                  style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;padding-right: 15px;padding-left: 15px;padding-top: 15px;padding-bottom: 15px;min-width: 100%;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                              >
                                                                  <table
                                                                      class="divider_content"
                                                                      align="center"
                                                                      border="0"
                                                                      cellpadding="0"
                                                                      cellspacing="0"
                                                                      width="100%"
                                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid transparent;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                                  >
                                                                      <tbody>
                                                                          <tr style="vertical-align: top">
                                                                              <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                                                                  <span></span>
                                                                              </td>
                                                                          </tr>
                                                                      </tbody>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                      </tbody>
                                                  </table>


                                          </div>
                                      </div>

                                  </div>
                              </div>
                          </div>
                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid mixed-two-up"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num4"
                                          style="display: table-cell;vertical-align: top;max-width: 320px;min-width: 164px;"
                                      >
                                          <div style="background-color: #F5F5F5; width: 100% !important;">

                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px">
                                                                  <span style="font-size: 14px; line-height: 16px;">
                                                                      <strong>${keys.Email_order_items_title || 'ITEMS ORDERED'}</strong>
                                                                  </span>
                                                                  <br>
                                                              </p>
                                                          </div>
                                                      </div>

                                                  </div>


                                          </div>
                                      </div>

                                      <div
                                          class="col num8"
                                          style="display: table-cell;vertical-align: top;min-width: 320px;max-width: 328px;"
                                      >
                                          <div style="background-color: #F5F5F5; width: 100% !important;">

                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: right">

                                                                  <br>
                                                              </p>
                                                          </div>
                                                      </div>

                                                  </div>


                                          </div>
                                      </div>

                                  </div>
                              </div>
                          </div>
                          ${prepareCartItems(cart.items, order.currency)}

                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num12"
                                          style="min-width: 320px;max-width: 500px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">


                                                  <table
                                                      border="0"
                                                      cellpadding="0"
                                                      cellspacing="0"
                                                      width="100%"
                                                      class="divider"
                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 100%;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                  >
                                                      <tbody>
                                                          <tr style="vertical-align: top">
                                                              <td
                                                                  class="divider_inner"
                                                                  style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;padding-right: 10px;padding-left: 10px;padding-top: 10px;padding-bottom: 10px;min-width: 100%;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                              >
                                                                  <table
                                                                      class="divider_content"
                                                                      align="center"
                                                                      border="0"
                                                                      cellpadding="0"
                                                                      cellspacing="0"
                                                                      width="100%"
                                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                                  >
                                                                      <tbody>
                                                                          <tr style="vertical-align: top">
                                                                              <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                                                                  <span></span>
                                                                              </td>
                                                                          </tr>
                                                                      </tbody>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                      </tbody>
                                                  </table>

                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div style="background-color:transparent;">
                              <div
                                  style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid mixed-two-up"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num8"
                                          style="display: table-cell;vertical-align: top;min-width: 320px;max-width: 328px;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:200%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:24px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 14px;line-height: 28px;text-align: right">
                                                                  <span style="font-size: 16px; line-height: 32px;">${keys.Email_order_subtotal || 'Subtotal'} (${cart.items.length}):
                                                                  </span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 14px;line-height: 28px;text-align: right">
                                                                  <span style="font-size: 16px; line-height: 32px;"> ${keys.Email_order_shipping || 'Shipping'}:</span>
                                                              </p>


                                                              <p style="margin: 0;font-size: 14px;line-height: 28px;text-align: right">
                                                                  <strong>
                                                                      <span style="font-size: 16px; line-height: 32px;">Order ${keys.Email_order_total || 'Total'}:</span>
                                                                  </strong>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>


                                          </div>
                                      </div>

                                      <div
                                          class="col num4"
                                          style="display: table-cell;vertical-align: top;max-width: 320px;min-width: 164px;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:200%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:24px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 24px;text-align: right">
                                                                  <span style="font-size: 16px; line-height: 32px;">${
                                                                    (cart.totalPrice - cart.shippingCost) +
                                                                    ' ' +
                                                                    order.currency
                                                                  }</span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 24px;text-align: right">
                                                                  <strong>
                                                                      <span style="font-size: 16px; line-height: 32px; color: rgb(128, 0, 0);">${cart.shippingCost +
                                                                        ' ' +
                                                                        order.currency}</span>
                                                                  </strong>
                                                              </p>

                                                              <p style="margin: 0;font-size: 12px;line-height: 24px;text-align: right">
                                                                  <span style="color: rgb(128, 0, 0); font-size: 12px; line-height: 24px;">
                                                                      <strong>
                                                                          <span style="font-size: 16px; line-height: 32px;">${
                                                                            cart.totalPrice +
                                                                            ' ' +
                                                                            order.currency
                                                                          }</span>
                                                                      </strong>
                                                                  </span>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div style="background-color:transparent;">
                          ${order.notes || ''}
                          </div>
                          <div style="background-color:transparent;">
                              <div
                                  style="margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ffffff;"
                                  class="block-grid"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:#ffffff;">

                                      <div
                                          class="col num12"
                                          style="min-width: 320px;max-width: 500px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="background-color: #3AAEE0; width: 100% !important;">


                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <span style="color: rgb(255, 255, 255); font-size: 16px; line-height: 19px;">
                                                                  ${keys.Email_order_send_mail || 'Send mail to'}
                                                                      <strong>${process.env.ADMIN_EMAILS}</strong>
                                                                  </span>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>


                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div style="background-color:transparent;">
                              <div
                                  style="margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;"
                                  class="block-grid"
                              >
                                  <div style="border-collapse: collapse;display: table;width: 100%;background-color:transparent;">

                                      <div
                                          class="col num12"
                                          style="min-width: 320px;max-width: 500px;display: table-cell;vertical-align: top;"
                                      >
                                          <div style="background-color: transparent; width: 100% !important;">


                                                  <table
                                                      border="0"
                                                      cellpadding="0"
                                                      cellspacing="0"
                                                      width="100%"
                                                      class="divider"
                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 100%;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                  >
                                                      <tbody>
                                                          <tr style="vertical-align: top">
                                                              <td
                                                                  class="divider_inner"
                                                                  style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;padding-right: 5px;padding-left: 5px;padding-top: 5px;padding-bottom: 5px;min-width: 100%;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                              >
                                                                  <table
                                                                      class="divider_content"
                                                                      align="center"
                                                                      border="0"
                                                                      cellpadding="0"
                                                                      cellspacing="0"
                                                                      width="100%"
                                                                      style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid transparent;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%"
                                                                  >
                                                                      <tbody>
                                                                          <tr style="vertical-align: top">
                                                                              <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                                                                                  <span></span>
                                                                              </td>
                                                                          </tr>
                                                                      </tbody>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                      </tbody>
                                                  </table>

                                                  <div class>

                                                      <div style="color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;line-height:120%; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
                                                          <div style="font-size:12px;line-height:14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:left;">
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <span style="font-size: 11px; line-height: 13px;">
                                                                      <br data-mce-bogus="1">
                                                                  </span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <span style="font-size: 11px; line-height: 13px;">
                                                                      This email was sent by Eshop.
                                                                  </span>
                                                              </p>
                                                              <p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center">
                                                                  <span style="font-size: 11px; line-height: 13px;">
                                                                      ©2020 Eshop, All rgihts reserved   |  Privacy Policy.
                                                                  </span>
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>

                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </td>
                  </tr>
              </tbody>
          </table>

      </body>
  </html>`;
};

export default emailTemplates;
